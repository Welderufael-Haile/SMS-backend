const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Store in memory for quick processing
const express = require('express');
const router = express.Router();
const {getMarks, createMark, updateMark, deleteMark, getDropdowns, importMarksFromExcel
} = require('../controllers/marksController');

router.post('/import', upload.single('file'), importMarksFromExcel);
router.get('/', getMarks);
router.post('/', createMark);
router.put('/:id', updateMark);
router.delete('/:id', deleteMark);
router.get('/dropdowns', getDropdowns);
module.exports = router;