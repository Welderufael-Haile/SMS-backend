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
const path = require("path");

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
router.get("/", teacherController.getAllTeachers);
router.get("/:id", teacherController.getTeacherById);
router.get("/users/teachers", teacherController.getTeachersUsers); // Fixed route name

// Validation middleware
const validateTeacherData = (req, res, next) => {
  const { email, user_id, phone_number } = req.body;
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  
  // Phone validation
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({ error: "Phone number must be 10-15 digits" });
  }
  
  next();
};

// Check duplicate email middleware
const checkDuplicateEmail = async (req, res, next) => {
  try {
    const { email, id } = req.body;
    const db = require("../config/db");
    
    let query = "SELECT id FROM teachers WHERE email = ?";
    const params = [email];
    
    if (id) {
      query += " AND id != ?";
      params.push(id);
    }
    
    const [existing] = await db.query(query, params);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }
    
    next();
  } catch (err) {
    console.error("Error checking duplicate email:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Check duplicate user_id middleware
const checkDuplicateUserId = async (req, res, next) => {
  try {
    const { user_id, id } = req.body;
    const db = require("../config/db");
    
    let query = "SELECT id FROM teachers WHERE user_id = ?";
    const params = [user_id];
    
    if (id) {
      query += " AND id != ?";
      params.push(id);
    }
    
    const [existing] = await db.query(query, params);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "User ID already assigned to another teacher" });
    }
    
    next();
  } catch (err) {
    console.error("Error checking duplicate user_id:", err);
    res.status(500).json({ error: "Internal server error" });
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