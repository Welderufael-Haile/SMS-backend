// // addStudentController.js
// const db = require("../config/db");
// const fs = require("fs");
// const path = require("path");

// exports.addStudent = async (req, res) => {
//   const { full_name, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id } = req.body;
//   const profile_photo = req.file ? req.file.filename : null;

//   try {
//     // Check for the 5-digit year error (e.g., 20110)
//     const year = new Date(Date_of_birth).getFullYear();
//     if (year > 2100) {
//       if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file
//       return res.status(400).json({ error: "Invalid Year: Please use a 4-digit year (e.g. 2024)" });
//     }

//     const sql = `INSERT INTO Student 
//       (full_name, profile_photo, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
//     const [result] = await db.query(sql, [
//       full_name, profile_photo, Sex, Date_of_birth, 
//       parents_id || null, sections_id, terms_id || null, academic_year_id || null
//     ]);
    
//     // Send success status
//     res.status(201).json({ success: true, message: "Student registered successfully!" });
//   } catch (err) {
//     console.error("Error adding student:", err);
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };

// exports.getAllStudents = async (req, res) => {
//   try {
//     const [students] = await db.query(`
//       SELECT s.*, p.First_Name, p.Last_Name, p.Phone_Number, sec.name as section_name, sec.grade_level, 
//              t.term_name, ay.year_name
//       FROM Student s
//       LEFT JOIN parents p ON s.parents_id = p.id
//       LEFT JOIN sections sec ON s.sections_id = sec.id
//       LEFT JOIN terms t ON s.terms_id = t.id
//       LEFT JOIN academic_year ay ON s.academic_year_id = ay.id
//       ORDER BY s.id DESC
//     `);
//     res.status(200).json(students);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

// exports.updateStudent = async (req, res) => {
//   const { id } = req.params;
//   const {
//     full_name,
//     Sex,
//     Date_of_birth,
//     parents_id,
//     sections_id,
//     terms_id,
//     academic_year_id,
//   } = req.body;

//   // New uploaded photo (if any)
//   const newPhoto = req.file ? req.file.filename : null;

//   try {
//     /* STEP 1: Basic validation */
//     if (!full_name || !Sex || !Date_of_birth || !sections_id) {
//       return res.status(400).json({
//         error: "Required fields are missing",
//       });
//     }

//     /* STEP 2: Get existing student */
//     const [rows] = await db.query(
//       "SELECT profile_photo FROM Student WHERE id = ?",
//       [id]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     const oldPhoto = rows[0].profile_photo;

//     /* STEP 3: Decide final photo */
//     const finalPhoto = newPhoto || oldPhoto;

//     /* STEP 4: Update database FIRST */
//     const sql = `
//       UPDATE Student SET
//         full_name = ?,
//         profile_photo = ?,
//         Sex = ?,
//         Date_of_birth = ?,
//         parents_id = ?,
//         sections_id = ?,
//         terms_id = ?,
//         academic_year_id = ?
//       WHERE id = ?
//     `;

//     await db.query(sql, [
//       full_name,
//       finalPhoto,
//       Sex,
//       Date_of_birth,
//       parents_id || null,
//       sections_id,
//       terms_id || null,
//       academic_year_id || null,
//       id,
//     ]);

//     /* STEP 5: Delete old photo AFTER update */
//     if (newPhoto && oldPhoto) {
//       const oldPath = path.join(__dirname, "..", "uploads", oldPhoto);
//       if (fs.existsSync(oldPath)) {
//         fs.unlinkSync(oldPath);
//       }
//     }

//     /* STEP 6: Success response */
//     res.status(200).json({
//       message: "Student updated successfully",
//     });
//   } catch (err) {
//     console.error("Update student error:", err);
//     res.status(500).json({
//       error: "Failed to update student",
//     });
//   }
// };

// exports.deleteStudent = async (req, res) => {
//   const { id } = req.params;
//   try {
//     // 1. Get photo filename before deleting record
//     const [rows] = await db.query("SELECT profile_photo FROM Student WHERE id = ?", [id]);
    
//     if (rows.length > 0 && rows[0].profile_photo) {
//       const photoPath = path.join(__dirname, "..", "uploads", rows[0].profile_photo);
//       if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
//     }

//     await db.query("DELETE FROM Student WHERE id = ?", [id]);
//     res.status(200).json({ message: "Student deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to delete student" });
//   }
// };

// addStudentController.js
const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Helper function to generate a secure random password
const generateSecurePassword = () => {
    const length = 10;
    // Removed confusing characters like O, 0, l, 1
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password; // e.g., "aB3$kL9#pQ2"
  };

// Helper function to generate email from full name (with uniqueness check)
const generateEmail = async (fullName, connection) => {
  const nameParts = fullName.toLowerCase().split(' ');
  const firstName = nameParts[0].replace(/[^a-z]/g, '');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
  
  let baseEmail = lastName 
    ? `${firstName}.${lastName}` 
    : firstName;
  
  let email = `${baseEmail}@student.com`;
  let counter = 1;
  
  // Check if email exists and increment if needed
  const [existing] = await connection.query(
    'SELECT id FROM Users WHERE email = ?',
    [email]
  );
  
  while (existing.length > 0) {
    email = `${baseEmail}${counter}@student.com`;
    counter++;
    const [check] = await connection.query(
      'SELECT id FROM Users WHERE email = ?',
      [email]
    );
    if (check.length === 0) break;
  }
  
  return email;
};

exports.addStudent = async (req, res) => {
  const { full_name, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id } = req.body;
  const profile_photo = req.file ? req.file.filename : null;

  // Start a transaction
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check for the 5-digit year error (e.g., 20110)
    const year = new Date(Date_of_birth).getFullYear();
    if (year > 2100) {
      if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "Invalid Year: Please use a 4-digit year (e.g. 2024)" });
    }

     // Generate email and secure password
    const email = await generateEmail(full_name, connection);
    const defaultPassword = generateSecurePassword(); // ← Now secure!
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 1. First create the user account
    const [userResult] = await connection.query(
      `INSERT INTO Users (full_name, email, password, role, status) 
       VALUES (?, ?, ?, 'student', 'active')`,
      [full_name, email, hashedPassword]
    );

    const userId = userResult.insertId;

    // 2. Now create the student with the user_id
    const sql = `INSERT INTO Student 
      (full_name, profile_photo, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const [studentResult] = await connection.query(sql, [
      full_name, profile_photo, Sex, Date_of_birth, 
      parents_id || null, sections_id, terms_id || null, academic_year_id || null,
      userId
    ]);

    await connection.commit();
    connection.release();
    
    // Send success status with login credentials
    res.status(201).json({ 
      success: true, 
      message: "Student registered successfully!",
      credentials: {
        email,
        password: defaultPassword
      }
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    
    // Clean up uploaded file if error
    if (req.file) fs.unlinkSync(req.file.path);
    
    console.error("Error adding student:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT s.*, 
             p.First_Name, p.Last_Name, p.Phone_Number, 
             sec.name as section_name, sec.grade_level, 
             t.term_name, ay.year_name,
             u.email, u.status as user_status
      FROM Student s
      LEFT JOIN parents p ON s.parents_id = p.id
      LEFT JOIN sections sec ON s.sections_id = sec.id
      LEFT JOIN terms t ON s.terms_id = t.id
      LEFT JOIN academic_year ay ON s.academic_year_id = ay.id
      LEFT JOIN Users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `);
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const {
    full_name,
    Sex,
    Date_of_birth,
    parents_id,
    sections_id,
    terms_id,
    academic_year_id,
  } = req.body;

  // New uploaded photo (if any)
  const newPhoto = req.file ? req.file.filename : null;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /* STEP 1: Basic validation */
    if (!full_name || !Sex || !Date_of_birth || !sections_id) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: "Required fields are missing",
      });
    }

    /* STEP 2: Get existing student with user_id */
    const [rows] = await connection.query(
      "SELECT profile_photo, user_id FROM Student WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: "Student not found" });
    }

    const oldPhoto = rows[0].profile_photo;
    const userId = rows[0].user_id;

    /* STEP 3: Decide final photo */
    const finalPhoto = newPhoto || oldPhoto;

    /* STEP 4: Update Users table if name changed */
    if (userId) {
      await connection.query(
        "UPDATE Users SET full_name = ? WHERE id = ?",
        [full_name, userId]
      );
    }

    /* STEP 5: Update Student table */
    const sql = `
      UPDATE Student SET
        full_name = ?,
        profile_photo = ?,
        Sex = ?,
        Date_of_birth = ?,
        parents_id = ?,
        sections_id = ?,
        terms_id = ?,
        academic_year_id = ?
      WHERE id = ?
    `;

    await connection.query(sql, [
      full_name,
      finalPhoto,
      Sex,
      Date_of_birth,
      parents_id || null,
      sections_id,
      terms_id || null,
      academic_year_id || null,
      id,
    ]);

    await connection.commit();
    connection.release();

    /* STEP 6: Delete old photo AFTER update */
    if (newPhoto && oldPhoto) {
      const oldPath = path.join(__dirname, "..", "uploads", oldPhoto);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    /* STEP 7: Success response */
    res.status(200).json({
      message: "Student updated successfully",
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    
    // Clean up new photo if error
    if (newPhoto) {
      const newPath = path.join(__dirname, "..", "uploads", newPhoto);
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
    }
    
    console.error("Update student error:", err);
    res.status(500).json({
      error: "Failed to update student",
    });
  }
};

exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Get student with user_id before deleting
    const [rows] = await connection.query(
      "SELECT profile_photo, user_id FROM Student WHERE id = ?", 
      [id]
    );
    
    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: "Student not found" });
    }

    const userId = rows[0].user_id;
    const photoPath = rows[0].profile_photo;

    // 2. Delete student record
    await connection.query("DELETE FROM Student WHERE id = ?", [id]);

    // 3. Delete associated user account if exists
    if (userId) {
      await connection.query("DELETE FROM Users WHERE id = ?", [userId]);
    }

    await connection.commit();
    connection.release();

    // 4. Delete photo file if exists
    if (photoPath) {
      const fullPath = path.join(__dirname, "..", "uploads", photoPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    res.status(200).json({ message: "Student and associated user deleted successfully" });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
};