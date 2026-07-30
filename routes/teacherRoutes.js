// // routes/teacherRoutes.js
// const express = require("express");
// const router = express.Router();
// const teacherController = require("../controllers/teacherController");
// const multer = require("multer");
// const path = require("path");
// const {getTeachersUsers } = require("../controllers/authController")
// // Set up Multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) =>
//     cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_")),
// });

// const upload = multer({ storage });
// router.get('/teachers-dropdown', getTeachersUsers);
// router.get("/", teacherController.getAllTeachers);
// router.get("/:id", teacherController.getTeacherById);

// router.post(
//   "/",
//   upload.fields([
//     { name: "profile_photo", maxCount: 1 },
//     { name: "degree_certificate", maxCount: 1 },
//   ]),
//   teacherController.createTeacher
// );

// router.put(
//   "/update/:id",
//   upload.fields([
//     { name: "profile_photo", maxCount: 1 },
//     { name: "degree_certificate", maxCount: 1 },
//   ]),
//   teacherController.updateTeacher
// );

// router.delete("/delete/:id", teacherController.deleteTeacher);

// module.exports = router;



const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const multer = require("multer");
const prisma = require("../config/prisma");
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_")),
});

// File filter for uploads
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
  const allowedDocTypes = ['application/pdf'];
  
  if (file.fieldname === 'profile_photo' && allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === 'degree_certificate' && allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Teacher Routes
router.get("/users/teachers", teacherController.getTeachersUsers);
router.get("/", teacherController.getAllTeachers);
router.get("/:id", teacherController.getTeacherById);

// Validation middleware
const validateTeacherData = (req, res, next) => {
  const { email, phone_number } = req.body;
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
  }
  
  if (phone_number) {
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: "Phone number must be 10-15 digits" });
    }
  }
  
  next();
};

// Check duplicate email middleware using Prisma
const checkDuplicateEmail = async (req, res, next) => {
  try {
    const { email, id } = req.body;
    if (!email) return next();
    
    const existing = await prisma.teachers.findFirst({
      where: {
        email,
        ...(id ? { NOT: { id: parseInt(id, 10) } } : {})
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

// Check duplicate user_id middleware using Prisma
const checkDuplicateUserId = async (req, res, next) => {
  try {
    const { user_id, id } = req.body;
    if (!user_id) return next();
    
    const existing = await prisma.teachers.findFirst({
      where: {
        user_id: parseInt(user_id, 10),
        ...(id ? { NOT: { id: parseInt(id, 10) } } : {})
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: "User ID already assigned to another teacher" });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

router.post(
  "/",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "degree_certificate", maxCount: 1 },
  ]),
  validateTeacherData,
  checkDuplicateEmail,
  checkDuplicateUserId,
  teacherController.createTeacher
);

router.put(
  "/update/:id",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "degree_certificate", maxCount: 1 },
  ]),
  validateTeacherData,
  checkDuplicateEmail,
  checkDuplicateUserId,
  teacherController.updateTeacher
);

router.delete("/delete/:id", teacherController.deleteTeacher);

module.exports = router;