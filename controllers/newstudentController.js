const fs = require('fs');
const path = require('path');
const pool = require("../config/db");
//const { upload } = require("../server");

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
// 📌 Update Student (with profile_photo & grade_certificate)
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, gender, email, phone_number, grade_level } = req.body;

    // Check if files are uploaded
    const profile_photo = req.files?.profile_photo ? req.files.profile_photo[0].filename : null;
    const grade_certificate = req.files?.grade_certificate ? req.files.grade_certificate[0].filename : null;

    // First, get the student data to retrieve old file paths
    const [student] = await pool.execute("SELECT * FROM students WHERE id=?", [id]);

    if (student.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // If new profile photo is uploaded, delete the old file
    if (profile_photo && student[0].profile_photo) {
      const oldProfilePhotoPath = path.join(__dirname, "uploads", student[0].profile_photo);
      fs.unlinkSync(oldProfilePhotoPath);  // Delete old profile photo
    }

    // If new grade certificate is uploaded, delete the old file
    if (grade_certificate && student[0].grade_certificate) {
      const oldGradeCertificatePath = path.join(__dirname, "uploads", student[0].grade_certificate);
      fs.unlinkSync(oldGradeCertificatePath);  // Delete old grade certificate
    }

    // Update student details in the database, including file paths if available
    await pool.execute(
      "UPDATE students SET full_name=?, gender=?, email=?, phone_number=?, grade_level=?, profile_photo=?, grade_certificate=? WHERE id=?",
      [
        full_name,
        gender,
        email,
        phone_number,
        grade_level,
        profile_photo || student[0].profile_photo,  // Retain old file if no new file uploaded
        grade_certificate || student[0].grade_certificate,  // Retain old file if no new file uploaded
        id
      ]
    );

    res.json({ message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Failed to update student" });
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