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
  JOIN sections sec ON e.sections_id = sec.id
  JOIN academic_year ay ON e.academic_year_id = ay.id
  JOIN subjects sub ON m.subjects_id = sub.id
  JOIN teacher_section_subjects tss ON
    tss.section_id = sec.id AND
    tss.subject_id = sub.id AND
    tss.academic_year_id = ay.id AND
    tss.is_active = 1
  WHERE tss.teacher_id = ?
`, [teacherId]);

res.json(marks);
} catch (err) {
console.error("Error fetching teacher marks:", err);
res.status(500).json({ error: "Internal server error" });
}
};

// get student with marks for teacher assigned sections/subjects/academic-years
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

    // Get all student marks data for teacher's assigned sections/subjects/academic-years
    const [students] = await pool.query(`
      SELECT
        s.id AS student_id,
        s.full_name,
        s.Sex AS gender,
        CONCAT(sec.grade_level, sec.name) AS section_name,
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
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.subject_id = sub.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ?
      ORDER BY s.full_name, sub.name
    `, [teacher.id]);    // Group data by student
    const grouped = {};
    students.forEach(row => {
      if (!grouped[row.student_id]) {
        grouped[row.student_id] = {
          student_id: row.student_id,
          full_name: row.full_name,
          gender: row.gender,
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

    // 2. Get teacher's assigned subjects from teacher_section_subjects
    const [subjects] = await pool.query(`
      SELECT DISTINCT s.id, s.name, s.grade_level
      FROM subjects s
      JOIN teacher_section_subjects tss ON s.id = tss.subject_id
      WHERE tss.teacher_id = ? AND tss.is_active = 1
    `, [teacher.id]);

    // 3. Get enrollments for teacher's assigned sections/academic-years
    const [enrollments] = await pool.query(`
      SELECT DISTINCT
        e.id,
        s.full_name AS student_name,
        CONCAT(sec.grade_level, sec.name) AS section_name,
        sec.grade_level,
        t.term_name,
        ay.year_name
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ?
      ORDER BY s.full_name
    `, [teacher.id]);    res.json({ 
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

    // 2. Get enrollment details to find section and academic year
    const [[enrollment]] = await pool.query(`
      SELECT e.sections_id, e.academic_year_id, s.full_name AS student_name
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      WHERE e.id = ?
    `, [enrollments_id]);

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // 3. Verify teacher is assigned to this specific section-subject-academic_year
    const [[assignment]] = await pool.query(`
      SELECT tss.*, sec.name AS section_name, sub.name AS subject_name, ay.year_name
      FROM teacher_section_subjects tss
      JOIN sections sec ON tss.section_id = sec.id
      JOIN subjects sub ON tss.subject_id = sub.id
      JOIN academic_year ay ON tss.academic_year_id = ay.id
      WHERE tss.teacher_id = ?
        AND tss.section_id = ?
        AND tss.subject_id = ?
        AND tss.academic_year_id = ?
        AND tss.is_active = 1
    `, [teacher.id, enrollment.sections_id, subjects_id, enrollment.academic_year_id]);

    if (!assignment) {
      console.log(`Teacher ${teacher.id} not assigned to section ${enrollment.sections_id}, subject ${subjects_id}, academic year ${enrollment.academic_year_id}`);
      return res.status(403).json({
        error: "Unauthorized: You are not assigned to teach this subject in this section",
        details: {
          teacher_id: teacher.id,
          section_id: enrollment.sections_id,
          subject_id: subjects_id,
          academic_year_id: enrollment.academic_year_id,
          student_name: enrollment.student_name
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

// Get teacher dashboard statistics
exports.getTeacherStats = async (req, res) => {
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

    // Get all marks for teacher's assigned students
    const [marks] = await pool.query(`
      SELECT
        e.student_id,
        s.Sex AS gender,
        m.score,
        CONCAT(sec.grade_level, sec.name) AS section,
        t.term_name,
        ay.year_name
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
    `, [teacher.id]);

    // Calculate statistics
    const uniqueStudents = new Set(marks.map(m => m.student_id));
    const failingStudents = marks.filter(m => m.score < 50);
    const uniqueFailingStudents = new Set(failingStudents.map(m => m.student_id));

    // Helper function to get gender
    const getGender = (g) => {
      const gender = g?.toLowerCase();
      if (gender === 'male' || gender === 'm') return 'male';
      if (gender === 'female' || gender === 'f') return 'female';
      return 'other';
    };

    const stats = {
      totalStudents: uniqueStudents.size,
      totalMarks: marks.length,
      averageScore: marks.length > 0 ? (marks.reduce((sum, m) => sum + m.score, 0) / marks.length).toFixed(2) : 0,
      passingRate: marks.length > 0 ? ((marks.filter(m => m.score >= 70).length / marks.length) * 100).toFixed(2) : 0,
      failingStudents: {
        male: [...new Set(failingStudents.filter(m => getGender(m.gender) === 'male').map(m => m.student_id))].length,
        female: [...new Set(failingStudents.filter(m => getGender(m.gender) === 'female').map(m => m.student_id))].length,
        total: uniqueFailingStudents.size
      },
      sections: {},
      termYears: {}
    };

    // Group by section - count unique failing students per section
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

    // Group by term-year
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
