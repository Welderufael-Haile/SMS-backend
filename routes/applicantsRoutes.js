const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const applicantsController = require('../controllers/applicantsController');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/cvs'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word (.doc, .docx), or TXT files are allowed.'));
    }
  }
});

// POST /api/applicants
router.post('/', upload.single('cv'), applicantsController.createApplicant);

// GET /api/applicants
router.get('/', applicantsController.getApplicants);
// delete
router.delete('/:id', applicantsController.deleteApplicant);

module.exports = router;
