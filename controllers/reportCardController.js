
const db = require("../config/db");
exports.getReportCardData = async (req, res) => {
  try {
    const { year_id, section_id, term_id, name } = req.query;

    let sql = `
      SELECT 
        s.id AS student_id,
        s.full_name,
        s.Sex,
        s.Date_of_birth,
        IF(s.Date_of_birth IS NOT NULL, TIMESTAMPDIFF(YEAR, s.Date_of_birth, CURDATE()), '-') AS age,
        sec.name AS section_name,
        sec.grade_level AS grade,
        sub.name AS subject_name,
        t.term_name,
        -- Calculate total directly in the query
        COALESCE(m.st1, 0) + 
        COALESCE(m.ws, 0) + 
        COALESCE(m.mid_exam, 0) + 
        COALESCE(m.project, 0) + 
        COALESCE(m.st2, 0) + 
        COALESCE(m.home_class_work, 0) + 
        COALESCE(m.class_activity, 0) + 
        COALESCE(m.final_exam, 0) AS score
      FROM Student s
      INNER JOIN enrollments e ON s.id = e.student_id
      INNER JOIN sections sec ON e.sections_id = sec.id
      INNER JOIN terms t ON e.terms_id = t.id
      INNER JOIN marks m ON m.enrollments_id = e.id
      INNER JOIN subjects sub ON m.subjects_id = sub.id 
      WHERE 1=1
    `;


    const params = [];

    if (year_id) {
      sql += ` AND e.academic_year_id = ?`;
      params.push(year_id);
    }
    if (section_id) {
      sql += ` AND e.sections_id = ?`;
      params.push(section_id);
    }
    if (term_id) {
      sql += ` AND e.terms_id = ?`;
      params.push(term_id);
    }
    if (name) {
      sql += ` AND s.full_name LIKE ?`;
      params.push(`%${name}%`);
    }

    sql += ` ORDER BY s.full_name ASC, sub.name ASC`;

    const [rows] = await db.query(sql, params);
    res.status(200).json(rows);
  } catch (error) {
    // This will now print the EXACT error in your terminal so you can see it
    console.error("DETAILED SQL ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
};