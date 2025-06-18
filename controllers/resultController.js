// controllers/resultsController.js
const pool = require("../config/db");

exports.getStudentResults = async (req, res) => {
  try {
    const { year_id, term_id, section_id, name } = req.query;

    let baseQuery = `
      SELECT 
        s.id AS student_id,
        s.full_name,
        s.Sex,
        sec.name AS section_name,
        sec.grade_level,
        ay.year_name,
        ay.id AS year_id,
        t.term_name,
        t.id AS term_id,
        sub.name AS subject_name,
        m.score,
        e.id AS enrollment_id
      FROM marks m
      JOIN subjects sub ON m.subjects_id = sub.id
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      WHERE 1=1
    `;

    const params = [];

    if (year_id) {
      baseQuery += ` AND ay.id = ?`;
      params.push(year_id);
    }

    if (term_id) {
      baseQuery += ` AND t.id = ?`;
      params.push(term_id);
    }

    if (section_id) {
      baseQuery += ` AND sec.id = ?`;
      params.push(section_id);
    }

    if (name) {
      baseQuery += ` AND s.full_name LIKE ?`;
      params.push(`%${name}%`);
    }

    const [results] = await pool.query(baseQuery, params);
    res.json(results);
  } catch (err) {
    console.error("Error fetching filtered results:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
};
