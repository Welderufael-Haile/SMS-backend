const express = require('express');
const upload = require('../middleware/upload');
const { 
  registerStudent, 
  updateStudent, 
  deleteStudent, 
  getStudents 
} = require('../controllers/newstudentController');

const router = express.Router();

// Remove the duplicate route
router.post('/register', upload.fields([
  { name: 'profile_photo', maxCount: 1 }, 
  { name: 'grade_certificate', maxCount: 1 }
]), registerStudent);

router.get('/', getStudents);

// Add upload middleware to update route
router.put('/update/:id', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'grade_certificate', maxCount: 1 }
]), updateStudent);

router.delete('/delete/:id', deleteStudent);

module.exports = router;