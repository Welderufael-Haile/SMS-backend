// routes/teacherRoutes.js
const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const multer = require("multer");
const path = require("path");

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_")),
});

const upload = multer({ storage });

router.get("/", teacherController.getAllTeachers);
router.get("/:id", teacherController.getTeacherById);

router.post(
  "/",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "degree_certificate", maxCount: 1 },
  ]),
  teacherController.createTeacher
);

router.put(
  "/update/:id",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "degree_certificate", maxCount: 1 },
  ]),
  teacherController.updateTeacher
);

router.delete("/delete/:id", teacherController.deleteTeacher);

module.exports = router;
