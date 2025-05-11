// routes/addStudentRoutes.js
const express = require("express");
const router = express.Router();
const studentController = require("../controllers/addStudentController");

router.post("/add", studentController.addStudent);
router.get("/fetch", studentController.getAllStudents);
router.delete("/delete/:id", studentController.deleteStudent);
router.put("/update/:id", studentController.updateStudent);

module.exports = router;
