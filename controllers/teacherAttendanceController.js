// backend/controllers/teacherAttendanceController.js
const pool = require('../config/db');

// Helper to check if enrollment is active
const checkEnrollmentActive = async (enrollmentId) => {
  const [[enrollment]] = await pool.query(
    `SELECT status FROM enrollments WHERE id = ?`,
    [enrollmentId]
  );
  return enrollment?.status === 'active';
};

// Get students for attendance marking (teacher's assigned sections)
exports.getStudentsForAttendance = async (req, res) => {
  const userId = req.user?.id;
  const { section_id, term_id, date } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Build query to get students from teacher's assigned sections
    let query = `
      SELECT DISTINCT
        e.id AS enrollment_id,
        s.id AS student_id,
        s.full_name,
        s.Sex AS gender,
        CONCAT(sec.grade_level, sec.name) AS section,
        ay.year_name,
        t.term_name,
        t.id AS term_id,
        sec.id AS section_id,
        -- Check if attendance already marked for this date
        (
          SELECT status FROM attendance a 
          WHERE a.enrollment_id = e.id AND a.date = ?
        ) AS attendance_status,
        (
          SELECT id FROM attendance a 
          WHERE a.enrollment_id = e.id AND a.date = ?
        ) AS attendance_id
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ? 
        AND e.status = 'active'
    `;

    const params = [date || new Date().toISOString().split('T')[0], 
                    date || new Date().toISOString().split('T')[0], 
                    teacher.id];

    if (section_id) {
      query += ` AND sec.id = ?`;
      params.push(section_id);
    }

    if (term_id) {
      query += ` AND e.terms_id = ?`;
      params.push(term_id);
    }

    query += ` ORDER BY s.full_name ASC`;

    const [students] = await pool.query(query, params);

    res.json({
      date: date || new Date().toISOString().split('T')[0],
      students: students.map(s => ({
        ...s,
        attendance_status: s.attendance_status || 'unmarked',
        attendance_id: s.attendance_id || null
      }))
    });

  } catch (err) {
    console.error("Error fetching students for attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark attendance for multiple students
exports.markAttendance = async (req, res) => {
  const userId = req.user.id;
  const { date, attendance } = req.body; // attendance array of {enrollment_id, status, remarks}

  if (!date || !attendance || !Array.isArray(attendance)) {
    return res.status(400).json({ error: "Invalid request format" });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get teacher ID
    const [[teacher]] = await connection.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ error: "Teacher not found" });
    }

    const results = {
      total: attendance.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const item of attendance) {
      try {
        const { enrollment_id, status, remarks } = item;

        // Validate status
        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }

        // Check if enrollment is active
        const isActive = await checkEnrollmentActive(enrollment_id);
        if (!isActive) {
          throw new Error("Cannot mark attendance for inactive enrollment");
        }

        // Verify teacher has access to this enrollment
        const [[access]] = await connection.query(`
          SELECT e.id 
          FROM enrollments e
          JOIN teacher_section_subjects tss ON
            tss.section_id = e.sections_id AND
            tss.academic_year_id = e.academic_year_id
          WHERE e.id = ? AND tss.teacher_id = ? AND tss.is_active = 1
          LIMIT 1
        `, [enrollment_id, teacher.id]);

        if (!access) {
          throw new Error("Unauthorized: You don't have access to this student");
        }

        // Check if attendance already exists for this date
        const [existing] = await connection.query(
          `SELECT id FROM attendance WHERE enrollment_id = ? AND date = ?`,
          [enrollment_id, date]
        );

        if (existing.length > 0) {
          // Update existing attendance
          await connection.query(
            `UPDATE attendance 
             SET status = ?, remarks = ?, marked_by = ?
             WHERE id = ?`,
            [status, remarks || null, teacher.id, existing[0].id]
          );
        } else {
          // Insert new attendance
          await connection.query(
            `INSERT INTO attendance (enrollment_id, date, status, remarks, marked_by)
             VALUES (?, ?, ?, ?, ?)`,
            [enrollment_id, date, status, remarks || null, teacher.id]
          );
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          enrollment_id: item.enrollment_id,
          error: err.message
        });
      }
    }

    await connection.commit();
    connection.release();

    const statusCode = results.failed === 0 ? 200 : 207;
    res.status(statusCode).json({
      message: results.failed === 0 ? "Attendance marked successfully" : "Partial success",
      results
    });

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error marking attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get teacher's assigned sections for dropdown
exports.getTeacherSections = async (req, res) => {
  const userId = req.user?.id;
  const { academic_year_id } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    let query = `
      SELECT DISTINCT
        sec.id,
        sec.name,
        sec.grade_level,
        CONCAT(sec.grade_level, sec.name) AS display_name,
        ay.id AS academic_year_id,
        ay.year_name
      FROM teacher_section_subjects tss
      JOIN sections sec ON tss.section_id = sec.id
      JOIN academic_year ay ON tss.academic_year_id = ay.id
      WHERE tss.teacher_id = ? AND tss.is_active = 1
    `;

    const params = [teacher.id];

    if (academic_year_id) {
      query += ` AND tss.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    query += ` ORDER BY sec.grade_level, sec.name`;

    const [sections] = await pool.query(query, params);
    res.json(sections);

  } catch (err) {
    console.error("Error fetching teacher sections:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get teacher's assigned terms (from their sections)
exports.getTeacherTerms = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [terms] = await pool.query(`
      SELECT DISTINCT
        t.id,
        t.term_name,
        ay.year_name,
        ay.id AS academic_year_id,
        CONCAT(t.term_name, ' (', ay.year_name, ')') AS display_name
      FROM teacher_section_subjects tss
      JOIN academic_year ay ON tss.academic_year_id = ay.id
      JOIN terms t ON ay.id = t.academic_year_id
      WHERE tss.teacher_id = ? AND tss.is_active = 1
      ORDER BY ay.year_name DESC, t.id
    `, [teacher.id]);

    res.json(terms);

  } catch (err) {
    console.error("Error fetching teacher terms:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get attendance history for a specific student
exports.getStudentAttendanceHistory = async (req, res) => {
  const userId = req.user?.id;
  const { student_id, term_id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify teacher has access to this student
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [[access]] = await pool.query(`
      SELECT e.id
      FROM enrollments e
      JOIN teacher_section_subjects tss ON
        tss.section_id = e.sections_id AND
        tss.academic_year_id = e.academic_year_id
      WHERE e.student_id = ? AND tss.teacher_id = ? AND tss.is_active = 1
      LIMIT 1
    `, [student_id, teacher.id]);

    if (!access) {
      return res.status(403).json({ error: "Unauthorized: You don't have access to this student" });
    }

    // Get attendance history
    let query = `
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name,
        t.term_name,
        ay.year_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
    `;

    const params = [student_id];

    if (term_id) {
      query += ` AND e.terms_id = ?`;
      params.push(term_id);
    }

    query += ` ORDER BY a.date DESC`;

    const [history] = await pool.query(query, params);

    // Calculate statistics
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ?
    `, [student_id]);

    const total = stats[0].total_days || 0;
    const percentage = total > 0 ? ((stats[0].present / total) * 100).toFixed(2) : 0;

    res.json({
      history,
      statistics: {
        ...stats[0],
        percentage
      }
    });

  } catch (err) {
    console.error("Error fetching attendance history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get today's attendance summary for teacher's sections
exports.getTodaySummary = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const today = new Date().toISOString().split('T')[0];

    const [summary] = await pool.query(`
      SELECT 
        CONCAT(sec.grade_level, sec.name) AS section,
        COUNT(DISTINCT e.id) AS total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excused,
        SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) AS not_marked
      FROM enrollments e
      JOIN sections sec ON e.sections_id = sec.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.academic_year_id = e.academic_year_id
      LEFT JOIN attendance a ON 
        a.enrollment_id = e.id AND 
        a.date = ?
      WHERE tss.teacher_id = ? AND e.status = 'active'
      GROUP BY sec.id
    `, [today, teacher.id]);

    res.json({
      date: today,
      sections: summary
    });

  } catch (err) {
    console.error("Error fetching today's summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
// backend/controllers/teacherAttendanceController.js - Fix the ambiguous status column

// Get attendance history for a specific student
exports.getStudentAttendanceHistory = async (req, res) => {
  const userId = req.user?.id;
  const { student_id, term_id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify teacher has access to this student
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [[access]] = await pool.query(`
      SELECT e.id
      FROM enrollments e
      JOIN teacher_section_subjects tss ON
        tss.section_id = e.sections_id AND
        tss.academic_year_id = e.academic_year_id
      WHERE e.student_id = ? AND tss.teacher_id = ? AND tss.is_active = 1
      LIMIT 1
    `, [student_id, teacher.id]);

    if (!access) {
      return res.status(403).json({ error: "Unauthorized: You don't have access to this student" });
    }

    // Get attendance history
    let query = `
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name,
        t.term_name,
        ay.year_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
    `;

    const params = [student_id];

    if (term_id) {
      query += ` AND e.terms_id = ?`;
      params.push(term_id);
    }

    query += ` ORDER BY a.date DESC`;

    const [history] = await pool.query(query, params);

    // Calculate statistics - FIXED: Specify which table's status column
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ?
    `, [student_id]);

    const total = stats[0].total_days || 0;
    const percentage = total > 0 ? ((stats[0].present / total) * 100).toFixed(2) : 0;

    res.json({
      history,
      statistics: {
        ...stats[0],
        percentage
      }
    });

  } catch (err) {
    console.error("Error fetching attendance history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};