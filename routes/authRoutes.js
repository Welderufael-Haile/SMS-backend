
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const auth = require('../controllers/authController');

const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// 🔹 NEW SECURITY MIDDLEWARE
const { sanitizeInput } = require('../middleware/sanitizeMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const { loginSchema, registerSchema } = require('../validators/authValidator');


// 🔒 1. Rate Limiter for Login
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 6,
  message: { error: "Too many login attempts. Please try again after 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});


// --- Public Routes ---
router.post(
  '/login',
  loginLimiter,
  sanitizeInput,
  validate(loginSchema),
  auth.login
);

router.post('/logout', auth.logout);


// --- Admin-Only Management (CRUD) ---

router.post(
  '/register',
  verifyToken,
  requireRole(['admin']),
  sanitizeInput,
  validate(registerSchema),
  auth.register
);

router.get(
  '/users',
  verifyToken,
  requireRole(['admin']),
  auth.getUsers
);

router.put(
  '/users/:id',
  verifyToken,
  requireRole(['admin']),
  sanitizeInput,
  auth.updateUser
);

router.delete(
  '/users/:id',
  verifyToken,
  requireRole(['admin']),
  auth.deleteUser
);


// Admin Dashboard Access
router.get(
  '/admin',
  verifyToken,
  requireRole(['admin']),
  auth.getActiveProfile('admin')
);

// Teacher Dashboard Access
router.get(
  '/teachers',
  verifyToken,
  requireRole(['teacher']),
  auth.getActiveProfile('teacher')
);

// Student Dashboard Access
router.get(
  '/students',
  verifyToken,
  requireRole(['student']),
  auth.getActiveProfile('student')
);

module.exports = router;