const multer = require('multer');
const path = require('path');

// Set up file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'teachers/'); // Save files in uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const teachers = multer({ storage });

module.exports = teachers;
