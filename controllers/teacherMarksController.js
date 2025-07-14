// backend/controllers/teacherMarksController.js
const pool = require('../config/db');

// Get all marks for the logged-in teacher based on assigned subjects
exports.getMarksByTeacherUserId = async (req, res) => {
const userId = req.user?.id;
if (!userId) return res.status(401).json({ error: "Unauthorized" });

try {
const [[teacher]] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
if (!teacher) return res.status(404).json({ error: "Teacher not found" });

const teacherId = teacher.id;

const [marks] = await pool.query(`
  SELECT m.*, e.id AS enrollment_id, s.full_name AS student_name, sub.name
  FROM marks m
  JOIN enrollments e ON m.enrollments_id = e.id
  JOIN Student s ON e.student_id = s.id
  JOIN subjects sub ON m.subjects_id = sub.id
  JOIN teacher_subjects ts ON ts.subject_id = m.subjects_id
  WHERE ts.teacher_id = ?
`, [teacherId]);

res.json(marks);
} catch (err) {
console.error("Error fetching teacher marks:", err);
res.status(500).json({ error: "Internal server error" });
}
};

// get student with marks fro teacher subjects
exports.getStudentsWithMarks = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?', 
      [userId]
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Get all student marks data
    const [students] = await pool.query(`
      SELECT 
        s.id AS student_id,
        s.full_name,
        sec.name AS section_name,
        t.term_name,
        ay.year_name,
        sub.name AS subject_name,
        m.score
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN subjects sub ON m.subjects_id = sub.id
      JOIN teacher_subjects ts ON ts.subject_id = sub.id
      WHERE ts.teacher_id = ?
      ORDER BY s.full_name, sub.name
    `, [teacher.id]);

    // Group data by student
    const grouped = {};
    students.forEach(row => {
      if (!grouped[row.student_id]) {
        grouped[row.student_id] = {
          student_id: row.student_id,
          full_name: row.full_name,
          section: row.section_name,
          subjects: []
        };
      }

      grouped[row.student_id].subjects.push({
        name: row.subject_name,
        score: row.score,
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
    // 1. Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?', 
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // 2. Get teacher's subjects (unchanged)
    const [subjects] = await pool.query(`
      SELECT s.id, s.name, s.grade_level 
      FROM subjects s
      JOIN teacher_subjects ts ON s.id = ts.subject_id
      WHERE ts.teacher_id = ?
    `, [teacher.id]);

    // 3. Get UNIQUE enrollments (modified query)
    const [enrollments] = await pool.query(`
      SELECT DISTINCT
        e.id,
        s.full_name AS student_name,
        sec.name AS section_name,
        sec.grade_level,
        t.term_name,
        ay.year_name
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN subjects sub ON sub.grade_level = sec.grade_level
      JOIN teacher_subjects ts ON ts.subject_id = sub.id
      WHERE ts.teacher_id = ?
      ORDER BY s.full_name
    `, [teacher.id]);

    res.json({ 
      subjects, 
      enrollments: enrollments.map(e => ({
        id: e.id,
        display_text: `${e.student_name} - (Grade ${e.grade_level}${e.section_name}, ${e.term_name} ${e.year_name})`,
        ...e
      }))
    });
  } catch (err) {
    console.error("Error fetching dropdowns:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add mark
exports.addTeacherMark = async (req, res) => {
  const userId = req.user.id;
  const { enrollments_id, subjects_id, score } = req.body;

  try {
    // 1. Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?', 
      [userId]
    );
    if (!teacher) return res.status(403).json({ error: "Teacher not found" });

    // 2. Verify subject assignment (with debug info)
    const [[subjectAssignment]] = await pool.query(
      `SELECT ts.*, s.name AS subject_name 
       FROM teacher_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       WHERE ts.teacher_id = ? AND ts.subject_id = ?`,
      [teacher.id, subjects_id]
    );

    if (!subjectAssignment) {
      console.log(`Teacher ${teacher.id} not assigned to subject ${subjects_id}`);
      return res.status(403).json({ 
        error: "Unauthorized subject",
        details: {
          teacher_id: teacher.id,
          subject_id: subjects_id,
          available_subjects: await getTeacherSubjects(teacher.id)
        }
      });
    }

    // 3. Check for existing mark for the same enrollment and subject
    const [[existingMark]] = await pool.query(
      `SELECT id FROM marks WHERE enrollments_id = ? AND subjects_id = ?`,
      [enrollments_id, subjects_id]
    );
    if (existingMark) {
      return res.status(409).json({ error: "Mark already exists for this student and subject." });
    }

    // 4. Insert the mark
    await pool.query(
      `INSERT INTO marks (enrollments_id, subjects_id, score)
       VALUES (?, ?, ?)`, 
      [enrollments_id, subjects_id, score]
    );

    res.status(201).json({ message: "Mark added successfully" });

  } catch (err) {
    console.error("Error adding mark:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
