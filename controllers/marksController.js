const db = require('../config/db');

exports.getMarks = async (req, res) => {
  try {
    const { search } = req.query;

    let sql = `
      SELECT 
        m.id, 
        m.score, 
        s.id AS subject_id, 
        s.name AS subjects_name,
        s.grade_level AS subjects_grade_level,
        e.id AS enrollment_id,
        st.id AS student_id, 
        st.full_name AS student_name,
        ay.year_name AS academic_year,
        t.term_name AS term,
        sec.name AS section_name
      FROM marks m
      JOIN subjects s ON m.subjects_id = s.id
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN student st ON e.student_id = st.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
    `;

    const params = [];

    if (search) {
      sql += ` WHERE st.full_name LIKE ? OR s.name LIKE ? OR ay.year_name LIKE ? OR t.term_name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY ay.year_name, t.term_name, st.full_name, s.name`;

    const [results] = await db.execute(sql, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching marks:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createMark = async (req, res) => {
  try {
    const { enrollment_id, subject_id, score } = req.body;
    
    const [result] = await db.execute(
      `INSERT INTO marks (enrollments_id, subjects_id, score) VALUES (?, ?, ?)`,
      [enrollment_id, subject_id, score]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      enrollment_id, 
      subject_id, 
      score 
    });
  } catch (err) {
    console.error('Error creating mark:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateMark = async (req, res) => {
  try {
    const { id } = req.params;
    const { enrollment_id, subject_id, score } = req.body;

    await db.execute(
      `UPDATE marks SET enrollments_id = ?, subjects_id = ?, score = ? WHERE id = ?`,
      [enrollment_id, subject_id, score, id]
    );
    
    res.json({ message: 'Mark updated successfully' });
  } catch (err) {
    console.error('Error updating mark:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteMark = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(`DELETE FROM marks WHERE id = ?`, [id]);
    res.json({ message: 'Mark deleted successfully' });
  } catch (err) {
    console.error('Error deleting mark:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDropdowns = async (req, res) => {
  try {
    const [enrollments] = await db.execute(`
      SELECT 
        e.id, 
        st.full_name AS student_name, 
        s.name AS section_name,
        ay.year_name, 
        t.term_name
      FROM enrollments e
      JOIN student st ON e.student_id = st.id
      JOIN sections s ON e.sections_id = s.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
    `);

    const [subjects] = await db.execute(`SELECT id, name FROM subjects`);

    res.json({ enrollments, subjects });
  } catch (error) {
    console.error("Error fetching dropdowns:", error);
    res.status(500).json({ message: "Server error while fetching dropdowns" });
  }
};