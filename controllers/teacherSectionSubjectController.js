// controllers/teacherSectionSubjectController.js
const db = require("../config/db");

function devError(err) {
  return process.env.NODE_ENV === "production" ? undefined : err?.message || String(err);
}

/**
 * Helper: normalize a value to Number or null
 */
function toNumberOrNull(val) {
  const n = Number(val);
  return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
}

/* ADD ASSIGNMENT */
exports.addAssignment = async (req, res) => {
  try {
    const teacher_id = toNumberOrNull(req.body.teacher_id);
    const section_id = toNumberOrNull(req.body.section_id);
    const subject_id = toNumberOrNull(req.body.subject_id);
    const academic_year_id = toNumberOrNull(req.body.academic_year_id);

    if (!teacher_id || !section_id || !subject_id || !academic_year_id) {
      return res.status(400).json({
        message: "teacher_id, section_id, subject_id and academic_year_id are required",
      });
    }
    // Validate referenced records exist (helpful to catch typos/invalid ids)
    const [[teacherRow]] = await db.query(`SELECT id FROM teachers WHERE id = ?`, [teacher_id]);
    if (!teacherRow) return res.status(400).json({ message: `Teacher id ${teacher_id} not found` });

    const [[sectionRow]] = await db.query(`SELECT id FROM sections WHERE id = ?`, [section_id]);
    if (!sectionRow) return res.status(400).json({ message: `Section id ${section_id} not found` });

    const [[subjectRow]] = await db.query(`SELECT id FROM subjects WHERE id = ?`, [subject_id]);
    if (!subjectRow) return res.status(400).json({ message: `Subject id ${subject_id} not found` });

    const [[yearRow]] = await db.query(`SELECT id FROM academic_year WHERE id = ?`, [academic_year_id]);
    if (!yearRow) return res.status(400).json({ message: `Academic year id ${academic_year_id} not found` });

    // Prevent creating duplicate section-subject assignments (same section-subject should have only one teacher)
    const [exists] = await db.query(
      `SELECT id FROM teacher_section_subjects
       WHERE section_id=? AND subject_id=? AND academic_year_id=? AND is_active=1`,
      [section_id, subject_id, academic_year_id]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "This section and subject combination already has an active teacher assigned. Each section-subject can only have one active teacher." });
    }

    // Deactivate any existing assignments for this section-subject-year combination
    await db.query(
      `UPDATE teacher_section_subjects
       SET is_active = 0
       WHERE section_id=? AND subject_id=? AND academic_year_id=?`,
      [section_id, subject_id, academic_year_id]
    );

    const sql = `INSERT INTO teacher_section_subjects (teacher_id, section_id, subject_id, academic_year_id)
                 VALUES (?, ?, ?, ?)`;
    try {
      await db.query(sql, [teacher_id, section_id, subject_id, academic_year_id]);
      return res.status(201).json({ message: "Assignment created successfully" });
    } catch (err) {
      // In case of race condition where a duplicate was inserted between the SELECT and INSERT
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(200).json({ message: 'Assignment already exists (race condition) - skipped' });
      }
      throw err;
    }
  } catch (error) {
    console.error("addAssignment error:", error);
    res.status(500).json({ message: "Failed to create assignment", error: devError(error) });
  }
};

/* GET ALL ASSIGNMENTS */
exports.getAssignments = async (req, res) => {
  try {
    // Format section as grade+name (e.g., 4A) so frontend can render consistently
    const [rows] = await db.query(`
      SELECT
        tss.id,
        t.id AS teacher_id,
        t.full_name AS teacher,
        s.id AS section_id,
        CONCAT(COALESCE(s.grade_level,''), COALESCE(s.name,'')) AS section,
        sub.id AS subject_id,
        sub.name AS subject,
        ay.id AS academic_year_id,
        ay.year_name AS academic_year,
        tss.is_active
      FROM teacher_section_subjects tss
      JOIN teachers t ON t.id = tss.teacher_id
      JOIN sections s ON s.id = tss.section_id
      JOIN subjects sub ON sub.id = tss.subject_id
      LEFT JOIN academic_year ay ON ay.id = tss.academic_year_id
      ORDER BY ay.year_name, t.full_name
    `);

    res.json(rows);
  } catch (error) {
    console.error("getAssignments error:", error);
    res.status(500).json({ message: "Failed to fetch assignments", error: devError(error) });
  }
};

/* GET SINGLE ASSIGNMENT */
exports.getAssignment = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [rows] = await db.query(`
      SELECT
        tss.id,
        tss.teacher_id,
        t.id AS teacher_id_ref,
        t.full_name AS teacher,
        tss.section_id,
        s.id AS section_id_ref,
        CONCAT(COALESCE(s.grade_level,''), COALESCE(s.name,'')) AS section,
        tss.subject_id,
        sub.id AS subject_id_ref,
        sub.name AS subject,
        tss.academic_year_id,
        ay.id AS academic_year_id_ref,
        ay.year_name AS academic_year,
        tss.is_active
      FROM teacher_section_subjects tss
      JOIN teachers t ON t.id = tss.teacher_id
      JOIN sections s ON s.id = tss.section_id
      JOIN subjects sub ON sub.id = tss.subject_id
      LEFT JOIN academic_year ay ON ay.id = tss.academic_year_id
      WHERE tss.id = ?
    `, [id]);

    if (rows.length === 0) return res.status(404).json({ message: "Assignment not found" });

    res.json(rows[0]);
  } catch (error) {
    console.error("getAssignment error:", error);
    res.status(500).json({ message: "Failed to fetch assignment", error: devError(error) });
  }
};

/* UPDATE ASSIGNMENT */
exports.updateAssignment = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id);
    const teacher_id = toNumberOrNull(req.body.teacher_id);
    const section_id = toNumberOrNull(req.body.section_id);
    const subject_id = toNumberOrNull(req.body.subject_id);
    const academic_year_id = toNumberOrNull(req.body.academic_year_id);

    if (!id || !teacher_id || !section_id || !subject_id || !academic_year_id) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Prevent updating to a section-subject combination that already has a different teacher
    const [exists] = await db.query(
      `SELECT id FROM teacher_section_subjects
       WHERE section_id=? AND subject_id=? AND academic_year_id=?
       AND id!=? AND is_active=1`,
      [section_id, subject_id, academic_year_id, id]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "This section and subject combination already has an active teacher assigned. Each section-subject can only have one active teacher." });
    }

    // Deactivate any existing assignments for the target section-subject-year combination
    await db.query(
      `UPDATE teacher_section_subjects
       SET is_active = 0
       WHERE section_id=? AND subject_id=? AND academic_year_id=? AND id!=?`,
      [section_id, subject_id, academic_year_id, id]
    );

    await db.query(
      `UPDATE teacher_section_subjects
       SET teacher_id=?, section_id=?, subject_id=?, academic_year_id=?, is_active=1
       WHERE id=?`,
      [teacher_id, section_id, subject_id, academic_year_id, id]
    );

    res.json({ message: "Assignment updated successfully" });
  } catch (error) {
    console.error("updateAssignment error:", error);
    res.status(500).json({ message: "Failed to update assignment", error: devError(error) });
  }
};

/* TOGGLE ASSIGNMENT STATUS */
exports.toggleAssignmentStatus = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    // Get current status
    const [rows] = await db.query("SELECT is_active FROM teacher_section_subjects WHERE id=?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Assignment not found" });

    const newStatus = !rows[0].is_active;

    await db.query("UPDATE teacher_section_subjects SET is_active = ? WHERE id=?", [newStatus, id]);

    res.json({ message: `Assignment ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error("toggleAssignmentStatus error:", error);
    res.status(500).json({ message: "Failed to toggle assignment status", error: devError(error) });
  }
};