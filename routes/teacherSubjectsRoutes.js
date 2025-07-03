const express = require('express');
const router = express.Router();
const controller = require('../controllers/teacherSubjectsController');

// Public routes
router.get('/', controller.getAll);
router.post('/', controller.create);
router.delete('/:teacher_id/:subject_id', controller.delete);
router.put('/:old_teacher_id/:old_subject_id', controller.update);
router.get('/dropdowns', controller.getDropdowns);

module.exports = router;