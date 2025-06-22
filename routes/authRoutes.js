const express = require('express');
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
router.get('/admin', verifyToken, requireRole(['admin']), (req, res) => {
  res.json({ message: `Welcome Admin ${req.user.id}` });
});

//techers route
router.get('/teachers', verifyToken, requireRole(['teacher']), (req, res) => {
  res.json({ message: `Welcome Teacher ${req.user.id}` });
});

// students rouete
router.get('/students', verifyToken, requireRole(['student']), (req, res) => {
  res.json({ message: `Welcome Student ${req.user.id}` });
});

module.exports = router;
