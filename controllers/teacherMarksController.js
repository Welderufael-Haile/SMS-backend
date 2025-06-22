// backend/controllers/teacherMarksController.js
const pool = require('../config/db');
// Fetch marks for subjects assigned to the teacher
exports.getTeacherMarks = async (req, res) => {
  const teacherId = req.user.id;

  try {
    const [marks] = await pool.query(`
      SELECT m.id, m.score,
             s.full_name AS student_name,
             sub.name AS subject_name,
             ay.year_name AS academic_year, t.name AS term_name, sec.name AS section_name
      FROM marks m
      JOIN enrollments e ON m.enrollment_id = e.id
      JOIN students s ON e.student_id = s.id
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN teacher_subjects ts ON sub.id = ts.subject_id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.term_id = t.id
      JOIN sections sec ON e.section_id = sec.id
      WHERE ts.teacher_id = ?
    `, [teacherId]);

    res.json(marks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch marks' });
  }
};

// Add mark only if subject is assigned to teacher
exports.addTeacherMark = async (req, res) => {
  const teacherId = req.user.id;
  const { enrollment_id, subject_id, score } = req.body;

  try {
    const [[check]] = await pool.query(
      "SELECT * FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?",
      [teacherId, subject_id]
    );
    if (!check) return res.status(403).json({ error: "Subject not assigned to you." });

    await pool.query(
      "INSERT INTO marks (enrollment_id, subject_id, score) VALUES (?, ?, ?)",
      [enrollment_id, subject_id, score]
    );
    res.status(201).json({ message: "Mark added" });
  } catch (error) {
    res.status(500).json({ error: 'Error adding mark' });
  }
};

// Update mark if teacher owns the subject
exports.updateTeacherMark = async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;
  const { score } = req.body;

  try {
    const [[check]] = await pool.query(`
      SELECT m.id FROM marks m
      JOIN teacher_subjects ts ON ts.subject_id = m.subject_id
      WHERE m.id = ? AND ts.teacher_id = ?
    `, [id, teacherId]);

    if (!check) return res.status(403).json({ error: "Not authorized" });

    await pool.query("UPDATE marks SET score = ? WHERE id = ?", [score, id]);
    res.json({ message: "Mark updated" });
  } catch (error) {
    res.status(500).json({ error: 'Error updating mark' });
  }
};

// Delete mark if teacher owns the subject
exports.deleteTeacherMark = async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;

  try {
    const [[check]] = await pool.query(`
      SELECT m.id FROM marks m
      JOIN teacher_subjects ts ON ts.subject_id = m.subject_id
      WHERE m.id = ? AND ts.teacher_id = ?
    `, [id, teacherId]);

    if (!check) return res.status(403).json({ error: "Not authorized" });

    await pool.query("DELETE FROM marks WHERE id = ?", [id]);
    res.json({ message: "Mark deleted" });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting mark' });
  }
};
