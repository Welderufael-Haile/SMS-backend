const path = require("path");
const fs = require("fs");
const db = require("../config/db");

// Validation helper
const validateTeacherInput = (data) => {
  const errors = [];
  
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push("Full name must be at least 2 characters");
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }
  
  if (!data.phone_number || !/^[0-9]{10,15}$/.test(data.phone_number)) {
    errors.push("Phone number must be 10-15 digits");
  }
  
  if (!data.Subject || data.Subject.trim().length < 2) {
    errors.push("Subject is required");
  }
  
  if (!data.address || data.address.trim().length < 5) {
    errors.push("Address is required");
  }
  
  return errors;
};

// CREATE a new teacher
exports.createTeacher = async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      email,
      gender,
      phone_number,
      Subject,
      address,
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if user exists and has teacher role
    const [userCheck] = await db.query(
      "SELECT id, role FROM Users WHERE id = ? AND role = 'teacher'",
      [user_id]
    );

    if (userCheck.length === 0) {
      return res.status(400).json({ 
        error: "Invalid user ID or user is not a teacher" 
      });
    }

    const validationErrors = validateTeacherInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(", ") });
    }

    const profile_photo = req.files?.profile_photo?.[0]?.filename || null;
    const degree_certificate = req.files?.degree_certificate?.[0]?.filename || null;

    // Check for duplicate email
    const [emailCheck] = await db.query(
      "SELECT id FROM teachers WHERE email = ?",
      [email]
    );
    if (emailCheck.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Check for duplicate user_id
    const [userIdCheck] = await db.query(
      "SELECT id FROM teachers WHERE user_id = ?",
      [user_id]
    );
    if (userIdCheck.length > 0) {
      return res.status(400).json({ error: "User ID already assigned to another teacher" });
    }

    const sql = `
      INSERT INTO teachers (user_id, full_name, email, gender, phone_number, Subject, address, profile_photo, degree_certificate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      user_id,
      full_name.trim(),
      email.trim(),
      gender,
      phone_number.trim(),
      Subject.trim(),
      address.trim(),
      profile_photo,
      degree_certificate,
    ]);

    res.status(201).json({ 
      message: "Teacher created successfully",
      teacherId: result.insertId 
    });
  } catch (err) {
    console.error("Error creating teacher:", err);
    
    // Handle MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('email')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      if (err.sqlMessage.includes('user_id')) {
        return res.status(400).json({ error: "User ID already assigned" });
      }
    }
    
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET all teachers with user information 
exports.getAllTeachers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, u.full_name as user_full_name, u.email as user_email 
      FROM teachers t
      LEFT JOIN Users u ON t.user_id = u.id
      ORDER BY t.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET one teacher with user information
exports.getTeacherById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT t.*, u.full_name as user_full_name, u.email as user_email 
      FROM teachers t
      LEFT JOIN Users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching teacher:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all users with role = 'teacher' (excluding already assigned)
exports.getTeachersUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email FROM Users 
       WHERE role = 'teacher' 
       AND id NOT IN (SELECT user_id FROM teachers WHERE user_id IS NOT NULL) 
       ORDER BY full_name`
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching teacher users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// UPDATE teacher (FIXED - removed updated_at)
exports.updateTeacher = async (req, res) => {
  const { id } = req.params;
  
  try {
    const {
      user_id,
      full_name,
      email,
      gender,
      phone_number,
      Subject,
      address,
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const validationErrors = validateTeacherInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(", ") });
    }

    const [existing] = await db.query("SELECT * FROM teachers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacher = existing[0];
    const profile_photo = req.files?.profile_photo?.[0]?.filename;
    const degree_certificate = req.files?.degree_certificate?.[0]?.filename;

    // Check if user exists and has teacher role
    const [userCheck] = await db.query(
      "SELECT id, role FROM Users WHERE id = ? AND role = 'teacher'",
      [user_id]
    );

    if (userCheck.length === 0) {
      return res.status(400).json({ 
        error: "Invalid user ID or user is not a teacher" 
      });
    }

    // Check for duplicate email (excluding current teacher)
    const [emailCheck] = await db.query(
      "SELECT id FROM teachers WHERE email = ? AND id != ?",
      [email, id]
    );
    if (emailCheck.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Check for duplicate user_id (excluding current teacher)
    const [userIdCheck] = await db.query(
      "SELECT id FROM teachers WHERE user_id = ? AND id != ?",
      [user_id, id]
    );
    if (userIdCheck.length > 0) {
      return res.status(400).json({ error: "User ID already assigned to another teacher" });
    }

    // Delete old profile photo if a new one is being uploaded
    if (profile_photo && teacher.profile_photo) {
      const oldPhotoPath = path.join(__dirname, "..", "uploads", teacher.profile_photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlink(oldPhotoPath, (err) => {
          if (err) console.error("Error deleting old photo:", err);
        });
      }
    }

    // Delete old degree certificate if a new one is being uploaded
    if (degree_certificate && teacher.degree_certificate) {
      const oldCertPath = path.join(__dirname, "..", "uploads", teacher.degree_certificate);
      if (fs.existsSync(oldCertPath)) {
        fs.unlink(oldCertPath, (err) => {
          if (err) console.error("Error deleting old certificate:", err);
        });
      }
    }

    const updatedPhoto = profile_photo || teacher.profile_photo;
    const updatedDegree = degree_certificate || teacher.degree_certificate;

    // UPDATED SQL: Removed updated_at column
    const sql = `
      UPDATE teachers
      SET user_id = ?, full_name = ?, email = ?, gender = ?, phone_number = ?, Subject = ?, address = ?, profile_photo = ?, degree_certificate = ?
      WHERE id = ?
    `;

    await db.query(sql, [
      user_id,
      full_name.trim(),
      email.trim(),
      gender,
      phone_number.trim(),
      Subject.trim(),
      address.trim(),
      updatedPhoto,
      updatedDegree,
      id,
    ]);

    res.json({ 
      message: "Teacher updated successfully",
      teacherId: id 
    });
  } catch (err) {
    console.error("Error updating teacher:", err);
    
    // Handle MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('email')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      if (err.sqlMessage.includes('user_id')) {
        return res.status(400).json({ error: "User ID already assigned" });
      }
    }
    
    // Handle unknown column error
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.error("Database column error:", err.sqlMessage);
      return res.status(500).json({ 
        error: "Database configuration error. Please contact administrator." 
      });
    }
    
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// DELETE teacher
exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query("SELECT * FROM teachers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacher = existing[0];

    // Delete profile photo if exists
    if (teacher.profile_photo) {
      const photoPath = path.join(__dirname, "..", "uploads", teacher.profile_photo);
      if (fs.existsSync(photoPath)) {
        fs.unlink(photoPath, (err) => {
          if (err) console.error("Error deleting photo:", err);
        });
      }
    }

    // Delete degree certificate if exists
    if (teacher.degree_certificate) {
      const certPath = path.join(__dirname, "..", "uploads", teacher.degree_certificate);
      if (fs.existsSync(certPath)) {
        fs.unlink(certPath, (err) => {
          if (err) console.error("Error deleting certificate:", err);
        });
      }
    }

    // Delete teacher from DB
    await db.query("DELETE FROM teachers WHERE id = ?", [id]);

    res.json({ 
      message: "Teacher deleted successfully",
      deletedId: id 
    });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};