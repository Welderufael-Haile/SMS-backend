const express = require('express');
const pool = require('../config/db');

const router = express.Router();
const auth = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', auth.login);
router.post('/logout', auth.logout);
// Admin-only registration route
router.post('/register', verifyToken, requireRole(['admin']), auth.register);
router.get('/users', verifyToken, requireRole(['admin']), auth.getUsers);
router.put('/users/:id', verifyToken, requireRole(['admin']), auth.updateUser);
router.delete('/users/:id', verifyToken, requireRole(['admin']), auth.deleteUser);

// Role-protected dashboard sample routes
// Inside routes/auth.js

// Admin route
router.get('/admin', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT full_name, email, role FROM Users WHERE id = ?", 
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher route
router.get('/teachers', verifyToken, requireRole(['teacher']), async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT full_name, email, role FROM Users WHERE id = ?", 
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student route
router.get('/students', verifyToken, requireRole(['student']), async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT full_name, email, role FROM Users WHERE id = ?", 
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
