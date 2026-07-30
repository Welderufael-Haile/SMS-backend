const express = require('express');
const router = express.Router();
const marksController = require('../controllers/marksController');

router.get('/dropdowns', marksController.getDropdowns);
router.get('/stats', marksController.getMarksStats);
router.post('/import', marksController.importMarksFromExcel);

router.get('/', marksController.getMarks);
router.post('/', marksController.createMark);
router.put('/:id', marksController.updateMark);
router.delete('/:id', marksController.deleteMark);

module.exports = router;