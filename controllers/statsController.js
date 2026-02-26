

const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const { year, term } = req.query; // Get filters from frontend

    // 1. Get Total Students (Global)
    const [[{ totalStudents }]] = await db.query('SELECT COUNT(*) AS totalStudents FROM Student');

    // 2. Students grouped by academic year and term (With Optional Filtering)
    let studentQuery = `
      SELECT ay.year_name AS academic_year, t.term_name AS term, COUNT(e.student_id) AS student_count
      FROM enrollments e
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
    `;
    
    const queryParams = [];
    if (year && term) {
      studentQuery += ` WHERE ay.year_name = ? AND t.term_name = ?`;
      queryParams.push(year, term);
    }

    studentQuery += ` GROUP BY e.academic_year_id, e.terms_id ORDER BY ay.year_name, t.term_name`;
    const [studentsPerYearTerm] = await db.query(studentQuery, queryParams);

    // 3. Keep existing counts
    const [[{ totalTeachers }]] = await db.query('SELECT COUNT(*) AS totalTeachers FROM teachers');
    const [[{ totalSections }]] = await db.query('SELECT COUNT(*) AS totalSections FROM sections where status = "active"'); // Only count active sections

    // 4. Keep existing Sections per Grade
    const [sectionsPerGrade] = await db.query(`
      SELECT grade_level, COUNT(*) AS section_count
      FROM sections WHERE status = 'active'
      GROUP BY grade_level
      ORDER BY grade_level
    `);

    res.json({ 
      totalStudents,
      studentsPerYearTerm, 
      totalTeachers, 
      totalSections,
      sectionsPerGrade 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};