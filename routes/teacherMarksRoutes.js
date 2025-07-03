const express = require('express');
const router = express.Router();
const teacherMarksController = require('../controllers/teacherMarksController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Teacher-only routes
router.get('/marks', verifyToken, requireRole(['teacher']), teacherMarksController.getMarksByTeacherUserId);
router.get('/students-with-marks', verifyToken,  requireRole(['teacher']), teacherMarksController.getStudentsWithMarks);
router.get('/dropdowns', verifyToken, requireRole(['teacher']), teacherMarksController.getDropdowns);
router.post('/marks', verifyToken, requireRole(['teacher']), teacherMarksController.addTeacherMark);

module.exports = router;