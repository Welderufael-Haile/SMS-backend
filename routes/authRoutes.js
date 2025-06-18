const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', auth.login);
router.post('/logout', auth.logout);

// Admin-only registration route
router.post('/register', verifyToken, requireRole(['admin']), auth.register);

// Role-protected dashboard sample routes
router.get('/admin', verifyToken, requireRole(['admin']), (req, res) => {
  res.json({ message: `Welcome Admin ${req.user.id}` });
});
router.get('/teachers', verifyToken, requireRole(['teacher']), (req, res) => {
  res.json({ message: `Welcome Teacher ${req.user.id}` });
});
router.get('/students', verifyToken, requireRole(['student']), (req, res) => {
  res.json({ message: `Welcome Student ${req.user.id}` });
});

module.exports = router;
