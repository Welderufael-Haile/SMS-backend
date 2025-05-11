const express = require('express');
const upload = require('../middleware/upload');
const { registerStudent, updateStudent, deleteStudent, getStudents } = require('../controllers/newstudentController');

const router = express.Router();

// Define route for student registration
router.post('/register', upload.fields([{ name: 'profile_photo' }, { name: 'grade_certificate' }]), registerStudent);

// CRUD routes
router.post("/register", upload.fields([{ name: "profile_photo" }, { name: "grade_certificate" }]), registerStudent);
router.get("/", getStudents);
router.put("/update/:id", updateStudent);
router.delete("/delete/:id", deleteStudent);

module.exports = router;