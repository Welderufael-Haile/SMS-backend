const express = require("express");
const router = express.Router();
const classesController = require("../controllers/classesController");

// Get all classes
router.get("/", classesController.getAllClasses);

// Get a specific class by ID
router.get("/:id", classesController.getClassById);

// Get all students in a specific class
router.get("/:id/students", classesController.getClassStudents);

module.exports = router;