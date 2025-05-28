const pool = require('../config/db');

exports.createAcademicYear = async (req, res) => {
  try {
    const { year_name, start_date, end_date } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO academic_year (year_name, start_date, end_date) VALUES (?, ?, ?)',
      [year_name, start_date, end_date]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllAcademicYears = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM academic_year ORDER BY start_date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAcademicYearById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM academic_year WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { year_name, start_date, end_date } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE academic_year SET year_name = ?, start_date = ?, end_date = ? WHERE id = ?',
      [year_name, start_date, end_date, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    
    res.json({ message: 'Academic year updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [terms] = await pool.query(
      'SELECT id FROM terms WHERE academic_year_id = ?',
      [id]
    );
    
    if (terms.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete academic year with associated terms. Delete the terms first.' 
      });
    }
    
    const [result] = await pool.execute(
      'DELETE FROM academic_year WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    
    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
