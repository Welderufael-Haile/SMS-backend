// controllers/teachersController.js
const db = require('../config/db');

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM teachers');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching teachers', error: err });
  }
};

// Add a new teacher
exports.addTeacher = async (req, res) => {
  const { name, email, phone, subject } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO teachers (name, email, phone, subject) VALUES (?, ?, ?, ?)',
      [name, email, phone, subject]
    );
    res.status(201).json({ message: 'Teacher added successfully', teacherId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error adding teacher', error: err });
  }
};

// Edit teacher information
exports.editTeacher = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, subject } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE teachers SET name = ?, email = ?, phone = ?, subject = ? WHERE id = ?',
      [name, email, phone, subject, id]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Teacher updated successfully' });
    } else {
      res.status(404).json({ message: 'Teacher not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating teacher', error: err });
  }
};

// Delete a teacher
exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM teachers WHERE id = ?', [id]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Teacher deleted successfully' });
    } else {
      res.status(404).json({ message: 'Teacher not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting teacher', error: err });
  }
};