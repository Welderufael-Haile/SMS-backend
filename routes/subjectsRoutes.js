const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjectsController');

router.get('/', subjectsController.fetchSubjects);
router.post('/', subjectsController.addSubject);
router.put('/:id', subjectsController.updateSubject);
router.delete('/:id', subjectsController.deleteSubject);

module.exports = router;
