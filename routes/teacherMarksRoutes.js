// backend/routes/teacherMarksRoutes.js
const express = require('express');
const router = express.Router();
const teacherMarksController = require('../controllers/teacherMarksController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole(['teacher']));


// Get all marks for the logged-in teacher
router.get('/marks', teacherMarksController.getTeacherMarks);

// Add a new mark (only if subject is assigned to teacher)
router.post('/marks', teacherMarksController.addTeacherMark);

// Update a mark (only if teacher owns the subject)
router.put('/marks/:id', teacherMarksController.updateTeacherMark);

// Delete a mark (only if teacher owns the subject)
router.delete('/marks/:id', teacherMarksController.deleteTeacherMark);

module.exports = router;
