const express = require('express');
const router = express.Router();
const {
  getMarks,
  createMark,
  updateMark,
  deleteMark,
  getDropdowns
} = require('../controllers/marksController');

router.get('/', getMarks);
router.post('/', createMark);
router.put('/:id', updateMark);
router.delete('/:id', deleteMark);
router.get('/dropdowns', getDropdowns);

module.exports = router;