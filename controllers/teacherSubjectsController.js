const pool = require('../config/db');

// Get all teacher-subject assignments with names
exports.getAll = async (req, res) => {
  try {
    const [assignments] = await pool.query(`
      SELECT 
        ts.teacher_id,
        ts.subject_id,
        t.full_name AS teacher_name,
        s.name AS subject_name,
        s.grade_level
      FROM teacher_subjects ts
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN subjects s ON ts.subject_id = s.id
      ORDER BY t.full_name, s.name
    `);
    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create new assignment
exports.create = async (req, res) => {
  const { teacher_id, subject_id } = req.body;
  
  try {
    // Check if assignment already exists
    const [[exists]] = await pool.query(
      'SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?',
      [teacher_id, subject_id]
    );
    
    if (exists) {
      return res.status(409).json({ error: 'Assignment already exists' });
    }

    await pool.query(
      'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)',
      [teacher_id, subject_id]
    );
    
    res.status(201).json({ message: 'Assignment created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete assignment
exports.delete = async (req, res) => {
  const { teacher_id, subject_id } = req.params;
  
  try {
    const [result] = await pool.query(
      'DELETE FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?',
      [teacher_id, subject_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
// update teacher-subjects
// Update assignment
exports.update = async (req, res) => {
  const { old_teacher_id, old_subject_id } = req.params;
  const { new_teacher_id, new_subject_id } = req.body;

  try {
    // Check if new assignment already exists
    const [[exists]] = await pool.query(
      `SELECT 1 FROM teacher_subjects 
       WHERE teacher_id = ? AND subject_id = ?`,
      [new_teacher_id, new_subject_id]
    );

    if (exists) {
      return res.status(409).json({ error: 'Assignment already exists' });
    }

    // Update the assignment
    await pool.query(
      `UPDATE teacher_subjects 
       SET teacher_id = ?, subject_id = ?
       WHERE teacher_id = ? AND subject_id = ?`,
      [new_teacher_id, new_subject_id, old_teacher_id, old_subject_id]
    );

    res.json({ message: 'Assignment updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get teachers and subjects for dropdowns
exports.getDropdowns = async (req, res) => {
  try {
    const [teachers] = await pool.query('SELECT id, full_name FROM teachers ORDER BY full_name');
    const [subjects] = await pool.query('SELECT id, name, grade_level FROM subjects ORDER BY name');
    
    res.json({ teachers, subjects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};