
const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const db = require("../config/db"); // adjust if your DB connection file path differs

// 📌 Register Student (with profile_photo & grade_certificate)
exports.registerStudent = async (req, res) => {
  try {
    const { full_name, gender, email, phone_number, grade_level } = req.body;

    // Get uploaded files
    const profile_photo = req.files?.profile_photo ? req.files.profile_photo[0].filename : null;
    const grade_certificate = req.files?.grade_certificate ? req.files.grade_certificate[0].filename : null;

    await pool.execute(
      "INSERT INTO students (full_name, gender, email, phone_number, grade_level, profile_photo, grade_certificate) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [full_name, gender, email, phone_number, grade_level, profile_photo, grade_certificate]
    );

    res.status(201).json({ message: "Student registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to register student" });
  }
};

// 📌 Get All Students
exports.getStudents = async (req, res) => {
  try {
    const [students] = await pool.execute("SELECT * FROM students");
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// update student
exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const { full_name, gender, email, phone_number, grade_level } = req.body;

  const profile_photo = req.files?.profile_photo?.[0]?.filename;
  const grade_certificate = req.files?.grade_certificate?.[0]?.filename;

  try {
    const [existing] = await db.query("SELECT * FROM students WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = existing[0];

    // Delete old files if new ones are uploaded
    if (profile_photo && student.profile_photo) {
      const oldPhotoPath = path.join(__dirname, "..", "uploads", student.profile_photo);
      if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
    }

    if (grade_certificate && student.grade_certificate) {
      const oldCertPath = path.join(__dirname, "..", "uploads", student.grade_certificate);
      if (fs.existsSync(oldCertPath)) fs.unlinkSync(oldCertPath);
    }

    const updatedPhoto = profile_photo || student.profile_photo;
    const updatedDegree = grade_certificate || student.grade_certificate;

    const sql = `
      UPDATE students
      SET full_name=?, gender=?, email=?, phone_number=?, grade_level=?, profile_photo=?, grade_certificate=?
      WHERE id = ?
    `;

    await db.query(sql, [
      full_name,
      gender,
      email,
      phone_number,
      grade_level,
      updatedPhoto,
      updatedDegree,
      id,
    ]);

    res.json({ message: "Student updated successfully" });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 📌 Delete Student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the student data to retrieve file paths
    const [student] = await pool.execute("SELECT * FROM students WHERE id=?", [id]);

    if (student.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if files exist and delete them
    if (student[0].profile_photo) {
      const profilePhotoPath = path.join(__dirname, "..", "uploads", student[0].profile_photo);
      if (fs.existsSync(profilePhotoPath)) {
        fs.unlink(profilePhotoPath, (err) => {
          if (err) console.error("Failed to delete profile photo:", err);
        });
      }
    }

    if (student[0].grade_certificate) {
      const gradeCertificatePath = path.join(__dirname, "..", "uploads", student[0].grade_certificate);
      if (fs.existsSync(gradeCertificatePath)) {
        fs.unlink(gradeCertificatePath, (err) => {
          if (err) console.error("Failed to delete grade certificate:", err);
        });
      }
    }

    // Now delete the student record from the database
    await pool.execute("DELETE FROM students WHERE id=?", [id]);
    res.json({ message: "Student and their files deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
};