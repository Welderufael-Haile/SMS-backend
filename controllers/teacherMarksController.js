
// backend/controllers/teacherMarksController.js
const pool = require('../config/db');

// Weight constants (same as admin controller)
const MAX_WEIGHTS = {
  st1: 10, ws: 10, mid_exam: 20, project: 10,
  st2: 10, home_class_work: 5, class_activity: 5, final_exam: 30
};

// Helper to validate scores
const validateScores = (data) => {
  const errors = [];
  for (const [key, max] of Object.entries(MAX_WEIGHTS)) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      const val = parseFloat(data[key]);
      if (isNaN(val)) {
        errors.push(`${key} must be a valid number.`);
      } else if (val < 0 || val > max) {
        errors.push(`${key} exceeds the maximum allowed weight of ${max}%.`);
      }
    }
  }
  return errors;
};

// Check if enrollment is active
const checkEnrollmentActive = async (enrollmentId) => {
  const [[enrollment]] = await pool.query(
    `SELECT status FROM enrollments WHERE id = ?`,
    [enrollmentId]
  );
  return enrollment?.status === 'active';
};

// Get all marks for the logged-in teacher based on assigned subjects
exports.getMarksByTeacherUserId = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const teacherId = teacher.id;

    const [marks] = await pool.query(`
      SELECT 
        m.*, 
        e.id AS enrollment_id, 
        s.full_name AS student_name, 
        sub.name AS subject_name,
        sub.grade_level,
        sec.name AS section_name,
        sec.grade_level AS section_grade,
        ay.year_name,
        t.term_name,
        e.status AS enrollment_status
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN subjects sub ON m.subjects_id = sub.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.subject_id = sub.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ?
      ORDER BY s.full_name, sub.name
    `, [teacherId]);

    res.json(marks);
  } catch (err) {
    console.error("Error fetching teacher marks:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get students with marks for teacher assigned sections/subjects/academic-years
exports.getStudentsWithMarks = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const [students] = await pool.query(`
      SELECT
        s.id AS student_id,
        s.full_name,
        s.Sex AS gender,
        CONCAT(sec.grade_level, sec.name) AS section_name,
        t.term_name,
        ay.year_name,
        sub.name AS subject_name,
        m.id AS mark_id,
        m.st1,
        m.ws,
        m.mid_exam,
        m.project,
        m.st2,
        m.home_class_work,
        m.class_activity,
        m.final_exam,
        m.total_score,
        e.status AS enrollment_status
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN subjects sub ON m.subjects_id = sub.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.subject_id = sub.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ?
      ORDER BY s.full_name, sub.name
    `, [teacher.id]);

    // Group data by student
    const grouped = {};
    students.forEach(row => {
      if (!grouped[row.student_id]) {
        grouped[row.student_id] = {
          student_id: row.student_id,
          full_name: row.full_name,
          gender: row.gender,
          section: row.section_name,
          enrollment_status: row.enrollment_status,
          subjects: []
        };
      }

      grouped[row.student_id].subjects.push({
        mark_id: row.mark_id,
        name: row.subject_name,
        st1: row.st1,
        ws: row.ws,
        mid_exam: row.mid_exam,
        project: row.project,
        st2: row.st2,
        home_class_work: row.home_class_work,
        class_activity: row.class_activity,
        final_exam: row.final_exam,
        total_score: row.total_score,
        term: row.term_name,
        year: row.year_name
      });
    });

    const result = Object.values(grouped);
    return res.json(result);

  } catch (err) {
    console.error("Error fetching students with marks:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Dropdown data for teacher's assigned students and subjects
exports.getDropdowns = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [subjects] = await pool.query(`
      SELECT DISTINCT s.id, s.name, s.grade_level
      FROM subjects s
      JOIN teacher_section_subjects tss ON s.id = tss.subject_id
      WHERE tss.teacher_id = ? AND tss.is_active = 1
    `, [teacher.id]);

    // Only fetch ACTIVE enrollments
    const [enrollments] = await pool.query(`
      SELECT DISTINCT
        e.id,
        s.full_name AS student_name,
        CONCAT(sec.grade_level, sec.name) AS section_name,
        sec.grade_level,
        t.term_name,
        ay.year_name,
        e.status
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ? AND e.status = 'active'
      ORDER BY s.full_name
    `, [teacher.id]);

    res.json({ 
      subjects, 
      enrollments: enrollments.map(e => ({
        id: e.id,
        display_text: `${e.student_name} - (${e.section_name}, ${e.term_name} ${e.year_name})`,
        ...e
      }))
    });
  } catch (err) {
    console.error("Error fetching dropdowns:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add mark - FIXED: Removed total_score from INSERT
exports.addTeacherMark = async (req, res) => {
  const userId = req.user.id;
  const { 
    enrollments_id, 
    subjects_id, 
    st1, ws, mid_exam, project, 
    st2, home_class_work, class_activity, final_exam 
  } = req.body;

  try {
    // 1. Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(403).json({ error: "Teacher not found" });

    // 2. Check if enrollment is ACTIVE
    const isActive = await checkEnrollmentActive(enrollments_id);
    if (!isActive) {
      return res.status(403).json({ 
        error: "Cannot add marks for inactive enrollment",
        details: "Only active students can receive marks."
      });
    }

    // 3. Get enrollment details
    const [[enrollment]] = await pool.query(`
      SELECT e.sections_id, e.academic_year_id, s.full_name AS student_name
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      WHERE e.id = ?
    `, [enrollments_id]);

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // 4. Verify teacher assignment
    const [[assignment]] = await pool.query(`
      SELECT tss.*
      FROM teacher_section_subjects tss
      WHERE tss.teacher_id = ?
        AND tss.section_id = ?
        AND tss.subject_id = ?
        AND tss.academic_year_id = ?
        AND tss.is_active = 1
    `, [teacher.id, enrollment.sections_id, subjects_id, enrollment.academic_year_id]);

    if (!assignment) {
      return res.status(403).json({
        error: "Unauthorized: You are not assigned to teach this subject in this section"
      });
    }

    // 5. Validate scores
    const scores = { st1, ws, mid_exam, project, st2, home_class_work, class_activity, final_exam };
    const validationErrors = validateScores(scores);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }

    // 6. Check for existing mark
    const [[existingMark]] = await pool.query(
      `SELECT id FROM marks WHERE enrollments_id = ? AND subjects_id = ?`,
      [enrollments_id, subjects_id]
    );
    if (existingMark) {
      return res.status(409).json({ 
        error: "Mark already exists for this student and subject.",
        suggestion: "Please edit the existing mark instead."
      });
    }

    // 7. Insert the mark WITHOUT total_score (it's generated)
    await pool.query(
      `INSERT INTO marks 
       (enrollments_id, subjects_id, st1, ws, mid_exam, project, st2, 
        home_class_work, class_activity, final_exam)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [
        enrollments_id, subjects_id,
        st1 || null, ws || null, mid_exam || null, project || null,
        st2 || null, home_class_work || null, class_activity || null, final_exam || null
      ]
    );

    // 8. Get the newly inserted mark with calculated total
    const [[newMark]] = await pool.query(
      `SELECT * FROM marks WHERE enrollments_id = ? AND subjects_id = ?`,
      [enrollments_id, subjects_id]
    );

    res.status(201).json({ 
      message: "Mark added successfully",
      total_score: newMark.total_score
    });

  } catch (err) {
    console.error("Error adding mark:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update mark - FIXED: Removed total_score from UPDATE
exports.updateTeacherMark = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { 
    st1, ws, mid_exam, project, 
    st2, home_class_work, class_activity, final_exam 
  } = req.body;

  try {
    // 1. Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(403).json({ error: "Teacher not found" });

    // 2. Get mark details with enrollment info
    const [[mark]] = await pool.query(`
      SELECT m.*, e.sections_id, e.academic_year_id, e.status
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      WHERE m.id = ?
    `, [id]);

    if (!mark) {
      return res.status(404).json({ error: "Mark not found" });
    }

    // 3. Check if enrollment is ACTIVE
    if (mark.status !== 'active') {
      return res.status(403).json({ 
        error: "Cannot edit marks for inactive enrollment",
        details: "Only active students can have marks edited."
      });
    }

    // 4. Verify teacher assignment
    const [[assignment]] = await pool.query(`
      SELECT tss.*
      FROM teacher_section_subjects tss
      WHERE tss.teacher_id = ?
        AND tss.section_id = ?
        AND tss.subject_id = ?
        AND tss.academic_year_id = ?
        AND tss.is_active = 1
    `, [teacher.id, mark.sections_id, mark.subjects_id, mark.academic_year_id]);

    if (!assignment) {
      return res.status(403).json({
        error: "Unauthorized: You are not assigned to teach this subject"
      });
    }

    // 5. Validate scores
    const scores = { st1, ws, mid_exam, project, st2, home_class_work, class_activity, final_exam };
    const validationErrors = validateScores(scores);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }

    // 6. Update the mark WITHOUT total_score
    await pool.query(
      `UPDATE marks SET
        st1 = ?, ws = ?, mid_exam = ?, project = ?,
        st2 = ?, home_class_work = ?, class_activity = ?, final_exam = ?
       WHERE id = ?`, 
      [
        st1 || null, ws || null, mid_exam || null, project || null,
        st2 || null, home_class_work || null, class_activity || null, final_exam || null,
        id
      ]
    );

    // 7. Get updated mark with calculated total
    const [[updatedMark]] = await pool.query(
      `SELECT * FROM marks WHERE id = ?`,
      [id]
    );

    res.json({ 
      message: "Mark updated successfully",
      total_score: updatedMark.total_score
    });

  } catch (err) {
    console.error("Error updating mark:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE is removed - teachers cannot delete marks

// Get teacher dashboard statistics - ACTIVE STUDENTS ONLY
exports.getTeacherStats = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Only include marks from ACTIVE enrollments
    const [marks] = await pool.query(`
      SELECT
        e.student_id,
        s.Sex AS gender,
        m.total_score,
        CONCAT(sec.grade_level, sec.name) AS section,
        t.term_name,
        ay.year_name,
        e.status
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN subjects sub ON m.subjects_id = sub.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.subject_id = sub.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ? 
        AND e.status = 'active'  /* ← ONLY ACTIVE STUDENTS */
    `, [teacher.id]);

    // Filter to ensure we only count active students
    const activeMarks = marks.filter(m => m.status === 'active');
    
    const uniqueStudents = new Set(activeMarks.map(m => m.student_id));
    const failingStudents = activeMarks.filter(m => m.total_score < 50);
    const uniqueFailingStudents = new Set(failingStudents.map(m => m.student_id));

    const getGender = (g) => {
      const gender = g?.toLowerCase();
      if (gender === 'male' || gender === 'm') return 'male';
      if (gender === 'female' || gender === 'f') return 'female';
      return 'other';
    };

    const stats = {
      totalStudents: uniqueStudents.size,
      totalMarks: activeMarks.length,
      averageScore: activeMarks.length > 0 ? 
        (activeMarks.reduce((sum, m) => sum + m.total_score, 0) / activeMarks.length).toFixed(2) : 0,
      passingRate: activeMarks.length > 0 ? 
        ((activeMarks.filter(m => m.total_score >= 50).length / activeMarks.length) * 100).toFixed(2) : 0,
      failingStudents: {
        male: [...new Set(failingStudents.filter(m => getGender(m.gender) === 'male').map(m => m.student_id))].length,
        female: [...new Set(failingStudents.filter(m => getGender(m.gender) === 'female').map(m => m.student_id))].length,
        total: uniqueFailingStudents.size
      },
      sections: {},
      termYears: {}
    };

    // Calculate section statistics (only for active students)
    const sectionFailing = {};
    failingStudents.forEach(mark => {
      if (!sectionFailing[mark.section]) sectionFailing[mark.section] = new Set();
      sectionFailing[mark.section].add(mark.student_id);
    });
    
    Object.keys(sectionFailing).forEach(section => {
      const male = failingStudents.filter(m => m.section === section && getGender(m.gender) === 'male');
      const female = failingStudents.filter(m => m.section === section && getGender(m.gender) === 'female');
      stats.sections[section] = {
        failing: {
          male: new Set(male.map(m => m.student_id)).size,
          female: new Set(female.map(m => m.student_id)).size,
          total: sectionFailing[section].size
        }
      };
    });

    // Calculate term-year statistics (only for active students)
    const termYearFailing = {};
    failingStudents.forEach(mark => {
      const termYear = `${mark.term_name} (${mark.year_name})`;
      if (!termYearFailing[termYear]) termYearFailing[termYear] = new Set();
      termYearFailing[termYear].add(mark.student_id);
    });
    
    Object.keys(termYearFailing).forEach(termYear => {
      const male = failingStudents.filter(m => `${m.term_name} (${m.year_name})` === termYear && getGender(m.gender) === 'male');
      const female = failingStudents.filter(m => `${m.term_name} (${m.year_name})` === termYear && getGender(m.gender) === 'female');
      stats.termYears[termYear] = {
        failing: {
          male: new Set(male.map(m => m.student_id)).size,
          female: new Set(female.map(m => m.student_id)).size,
          total: termYearFailing[termYear].size
        }
      };
    });

    res.json(stats);

  } catch (err) {
    console.error("Error fetching teacher stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};