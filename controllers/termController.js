const pool = require('../config/db');

exports.createTerm = async (req, res) => {
  try {
    const { academic_year_id, term_name, start_date, end_date } = req.body;

    // Check if the term_name already exists for the same academic_year_id
    const [existing] = await pool.query(
      'SELECT id FROM Terms WHERE academic_year_id = ? AND term_name = ?',
      [academic_year_id, term_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This term name already exists for the selected academic year.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO Terms (academic_year_id, term_name, start_date, end_date) VALUES (?, ?, ?, ?)',
      [academic_year_id, term_name, start_date, end_date]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTermsByAcademicYear = async (req, res) => {
  try {
    const { academicYearId } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM Terms WHERE academic_year_id = ? ORDER BY start_date',
      [academicYearId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllTerms = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM terms ORDER BY start_date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTermById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM Terms WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const { term_name, start_date, end_date } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE Terms SET term_name = ?, start_date = ?, end_date = ? WHERE id = ?',
      [term_name, start_date, end_date, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    
    res.json({ message: 'Term updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTerm = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'DELETE FROM Terms WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    
    res.json({ message: 'Term deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};