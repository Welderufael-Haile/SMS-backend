
// const express = require('express');
// const pool = require('../config/db');
// const rateLimit = require('express-rate-limit'); // 🔹 Import rate limiter
// const router = express.Router();
// const auth = require('../controllers/authController');
// const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// // 🔒 1. Security: Rate Limiter for Login (OWASP A07)
// // Blocks user after 5 failed attempts for 15 minutes
// const loginLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, 
//   max: 4, 
//   message: { error: "Too many login attempts. Please try again after 15 minutes." },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // --- Public Routes ---
// // Apply limiter only to login to prevent brute force
// router.post('/login', loginLimiter, auth.login);
// router.post('/logout', auth.logout);


// // Only users with 'admin' role can perform CRUD on users
// router.post('/register', verifyToken, requireRole(['admin']), auth.register);
// router.get('/users', verifyToken, requireRole(['admin']), auth.getUsers);
// router.put('/users/:id', verifyToken, requireRole(['admin']), auth.updateUser);
// router.delete('/users/:id', verifyToken, requireRole(['admin']), auth.deleteUser);




// // Admin Profile
// router.get('/admin', verifyToken, requireRole(['admin']), async (req, res) => {
//   try {
//     const [[user]] = await pool.query(
//       "SELECT full_name, email, role FROM Users WHERE id = ?", 
//       [req.user.id]
//     );
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: "Server Error" });
//   }
// });

// // Teacher Profile
// router.get('/teachers', verifyToken, requireRole(['teacher']), async (req, res) => {
//   try {
//     const [[user]] = await pool.query(
//       "SELECT full_name, email, role FROM Users WHERE id = ?", 
//       [req.user.id]
//     );
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: "Server Error" });
//   }
// });

// // Student Profile
// router.get('/students', verifyToken, requireRole(['student']), async (req, res) => {
//   try {
//     const [[user]] = await pool.query(
//       "SELECT full_name, email, role FROM Users WHERE id = ?", 
//       [req.user.id]
//     );
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: "Server Error" });
//   }
// });

// module.exports = router;

const express = require('express');
const pool = require('../config/db');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// 🔒 1. Rate Limiter for Login
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 6, 
  message: { error: "Too many login attempts. Please try again after 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Public Routes ---
router.post('/login', loginLimiter, auth.login);
router.post('/logout', auth.logout);

// --- Admin-Only Management (CRUD) ---
router.post('/register', verifyToken, requireRole(['admin']), auth.register);
router.get('/users', verifyToken, requireRole(['admin']), auth.getUsers);
router.put('/users/:id', verifyToken, requireRole(['admin']), auth.updateUser);
router.delete('/users/:id', verifyToken, requireRole(['admin']), auth.deleteUser);

// These verify the token AND check the DB for 'active' status

 //prevents 'suspended' users from accessing data even with a valid token
 
const getActiveProfile = async (req, res, expectedRole) => {
  try {
    const [[user]] = await pool.query(
      "SELECT id, full_name, email, role, status FROM Users WHERE id = ?", 
      [req.user.id]
    );

    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: "Account is no longer active." });
    }

    if (user.role !== expectedRole) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// Admin Dashboard Access
router.get('/admin', verifyToken, requireRole(['admin']), (req, res) => {
  getActiveProfile(req, res, 'admin');
});

// Teacher Dashboard Access
router.get('/teachers', verifyToken, requireRole(['teacher']), (req, res) => {
  getActiveProfile(req, res, 'teacher');
});

// Student Dashboard Access
router.get('/students', verifyToken, requireRole(['student']), (req, res) => {
  getActiveProfile(req, res, 'student');
});

module.exports = router;