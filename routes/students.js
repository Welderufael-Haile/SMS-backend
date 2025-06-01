const express = require('express');
const pool = require('../config/db'); // assuming the database connection is in db.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads'; // Path to store uploaded files
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir); // Ensure the directory exists
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the filename
  },
});

const upload = multer({ storage });

// 1. Fetch all students
router.get('/students', async (req, res) => {
  try {
    const [students] = await pool.query('SELECT * FROM students');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students', error });
  }
});

// 2. Add a new student (with file upload)
router.post('/students', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'grade_certificate', maxCount: 1 },
]), async (req, res) => {
  const { full_name, gender, email, phone_number, grade_level } = req.body;
  const profile_photo = req.files['profile_photo'] ? req.files['profile_photo'][0].path : null;
  const grade_certificate = req.files['grade_certificate'] ? req.files['grade_certificate'][0].path : null;

  try {
    const [result] = await pool.query('INSERT INTO students (full_name, gender, email, phone_number, grade_level, profile_photo, grade_certificate) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [full_name, gender, email, phone_number, grade_level, profile_photo, grade_certificate]);
    
    res.json({ message: 'Student added successfully', studentId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to register student', error });
  }
});

// 3. Update student details (including file upload if provided)
router.put('/students/:id', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'grade_certificate', maxCount: 1 },
]), async (req, res) => {
  const { id } = req.params;
  const { full_name, gender, email, phone_number, grade_level } = req.body;
  const profile_photo = req.files['profile_photo'] ? req.files['profile_photo'][0].path : null;
  const grade_certificate = req.files['grade_certificate'] ? req.files['grade_certificate'][0].path : null;

  try {
    const [result] = await pool.query('UPDATE students SET full_name = ?, gender = ?, email = ?, phone_number = ?, grade_level = ?, profile_photo = ?, grade_certificate = ? WHERE id = ?', 
      [full_name, gender, email, phone_number, grade_level, profile_photo, grade_certificate, id]);

    if (result.affectedRows > 0) {
      res.json({ message: 'Student updated successfully' });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update student', error });
  }
});

// 4. Delete a student and remove their files
router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the student to get the file paths
    const [student] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);

    if (student.length > 0) {
      const { profile_photo, grade_certificate } = student[0];

      // Delete files if they exist
      if (profile_photo && fs.existsSync(profile_photo)) {
        fs.unlinkSync(profile_photo);
      }
      if (grade_certificate && fs.existsSync(grade_certificate)) {
        fs.unlinkSync(grade_certificate);
      }

      // Delete student record from DB
      await pool.query('DELETE FROM students WHERE id = ?', [id]);

      res.json({ message: 'Student deleted successfully' });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete student', error });
  }
});

module.exports = router;
