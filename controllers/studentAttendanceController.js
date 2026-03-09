// controllers/studentAttendanceController.js
const pool = require('../config/db');

// Get student's current enrollment and attendance history
exports.getStudentAttendance = async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get student ID
    const [[student]] = await pool.query(
      'SELECT id FROM Student WHERE user_id = ?',
      [userId]
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Get current active enrollment
    const [enrollment] = await pool.query(`
      SELECT 
        e.id as enrollment_id,
        ay.year_name,
        t.term_name,
        CONCAT(sec.grade_level, sec.name) as section
      FROM enrollments e
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE e.student_id = ? AND e.status = 'active'
      LIMIT 1
    `, [student.id]);

    // Get attendance history for current academic year
    const [history] = await pool.query(`
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ?
      ORDER BY a.date DESC
    `, [student.id]);

    // Calculate statistics
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
    `, [student.id]);

    const total = stats[0].total_days || 0;
    const percentage = total > 0 ? ((stats[0].present / total) * 100).toFixed(2) : 0;

    res.json({
      enrollment: enrollment[0] || null,
      history,
      statistics: {
        ...stats[0],
        percentage
      }
    });

  } catch (err) {
    console.error("Error fetching student attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get attendance for a specific term
exports.getAttendanceByTerm = async (req, res) => {
  const userId = req.user?.id;
  const { term_id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[student]] = await pool.query(
      'SELECT id FROM Student WHERE user_id = ?',
      [userId]
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const [history] = await pool.query(`
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ? AND e.terms_id = ?
      ORDER BY a.date DESC
    `, [student.id, term_id]);

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ? AND e.terms_id = ?
    `, [student.id, term_id]);

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
    console.error("Error fetching attendance by term:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};