// const express = require('express');
// const router = express.Router();
// const {addStudent} = require('../controllers/studentsController');

// // Route to add a student
// router.post('/add',addStudent);

// module.exports = router;
const express = require("express");
const { addStudent,  deleteStudent,  updateStudent, fetchStudents 
} = require("../controllers/studentsController"); // Ensure correct import

const router = express.Router();

router.post("/add", addStudent); // Add a new student
router.delete("/delete/:id", deleteStudent); // Delete a student by ID
router.put("/update/:id", updateStudent); // Update a student by ID
router.get("/fetch", fetchStudents); // Fetch all students

module.exports = router;
