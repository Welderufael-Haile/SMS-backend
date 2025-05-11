const express = require('express');
const router = express.Router();
const teachersController = require('../controllers/teachersController');

// Get all teachers
router.get('/', teachersController.getAllTeachers);

// Add a new teacher
router.post('/', teachersController.addTeacher);

// Update an existing teacher
router.put('/:id', teachersController.editTeacher);

// Delete a teacher
router.delete('/:id', teachersController.deleteTeacher);

module.exports = router;
