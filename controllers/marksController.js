// controllers/marksController.js
const db = require('../config/db');

// Get all marks with related data
exports.getAllMarks = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, s.Full_Name, sub.name AS subject_name, m.score,
             t.name AS term_name, ay.year AS academic_year
      FROM marks m
      JOIN enrollments e ON m.enrollment_id = e.id
      JOIN Student1 s ON e.student_id = s.id
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN terms t ON e.term_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch marks.' });
  }
};

// Add a new mark
exports.addMark = async (req, res) => {
  const { enrollment_id, subject_id, score } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO marks (enrollment_id, subject_id, score) VALUES (?, ?, ?)',
      [enrollment_id, subject_id, score]
    );
    res.status(201).json({ message: 'Mark added successfully.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add mark.' });
  }
};

// Update a mark
exports.updateMark = async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;
  try {
    await db.query('UPDATE marks SET score = ? WHERE id = ?', [score, id]);
    res.json({ message: 'Mark updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update mark.' });
  }
};

// Delete a mark
exports.deleteMark = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM marks WHERE id = ?', [id]);
    res.json({ message: 'Mark deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete mark.' });
  }
};
