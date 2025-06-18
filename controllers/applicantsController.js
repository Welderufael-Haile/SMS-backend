const path = require('path');
const fs = require('fs');
const db = require('../config/db'); // Assume you have a db.js for MySQL connection

exports.createApplicant = async (req, res) => {
  try {
    const { position, fullname, sex, email, phone } = req.body;
    const cv = req.file ? req.file.filename : null;

    if (!position || !fullname || !sex || !email || !phone || !cv) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const sql = `
      INSERT INTO job_applications (position, fullname, sex, email, phone, cv_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(sql, [position, fullname, sex, email, phone, cv]);
    res.status(201).json({ message: 'Application submitted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

exports.getApplicants = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM job_applications ORDER BY submitted_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};


exports.deleteApplicant = async (req, res) => {
  try {
    const { id } = req.params;
    // Get the CV file name before deleting the record
    const [rows] = await db.query('SELECT cv_path FROM job_applications WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Applicant not found.' });
    }
    const cvFile = rows[0].cv_path;
    // Delete the record from DB
    await db.query('DELETE FROM job_applications WHERE id = ?', [id]);
    // Delete the file from uploads/cvs if it exists
    if (cvFile) {
      const filePath = path.join(__dirname, '../uploads/cvs', cvFile);
      fs.unlink(filePath, (err) => {
        // Ignore error if file doesn't exist
      });
    }
    res.json({ message: 'Applicant deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};