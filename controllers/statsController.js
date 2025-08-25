const db = require('../config/db');

// Get stats for dashboard
exports.getStats = async (req, res) => {
  try {
    // Students grouped by academic year and term
    const [studentsPerYearTerm] = await db.query(`
      SELECT ay.year_name AS academic_year, t.term_name AS term, COUNT(e.student_id) AS student_count
      FROM enrollments e
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      GROUP BY e.academic_year_id, e.terms_id
      ORDER BY ay.year_name, t.term_name
    `);

    // Count teachers
    const [[{ totalTeachers }]] = await db.query(`
      SELECT COUNT(*) AS totalTeachers FROM teachers
    `);

    // Count sections
    const [[{ totalSections }]] = await db.query(`
      SELECT COUNT(*) AS totalSections FROM sections
    `);

    // 🔹 Sections grouped by grade_level
    const [sectionsPerGrade] = await db.query(`
      SELECT grade_level, COUNT(*) AS section_count
      FROM sections
      GROUP BY grade_level
      ORDER BY grade_level
    `);

    res.json({ 
      studentsPerYearTerm, 
      totalTeachers, 
      totalSections,
      sectionsPerGrade // new field
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
