
// module.exports = router;
const express = require("express");
const router = express.Router();
const studentController = require("../controllers/addStudentController");
const multer = require("multer");
const path = require("path");
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole(['admin', 'registrar']));

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `student_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// Routes
// Use upload.single('profile_photo') for the file field
router.post("/add", upload.single("profile_photo"), studentController.addStudent);
router.get("/fetch", studentController.getAllStudents);
router.delete("/delete/:id", studentController.deleteStudent);
router.put("/update/:id", upload.single("profile_photo"), studentController.updateStudent);

module.exports = router;