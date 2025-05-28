// routes/marksRoutes.js
const express = require('express');
const router = express.Router();
const marksController = require('../controllers/marksController');

router.get('/', marksController.getAllMarks);
router.post('/', marksController.addMark);
router.put('/:id', marksController.updateMark);
router.delete('/:id', marksController.deleteMark);

module.exports = router;
