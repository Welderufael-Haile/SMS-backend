
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.addStudent = async (req, res) => {
  const { full_name, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id } = req.body;
  const profile_photo = req.file ? req.file.filename : null;

  try {
    // Check for the 5-digit year error (e.g., 20110)
    const year = new Date(Date_of_birth).getFullYear();
    if (year > 2100) {
      if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file
      return res.status(400).json({ error: "Invalid Year: Please use a 4-digit year (e.g. 2024)" });
    }

    const sql = `INSERT INTO Student 
      (full_name, profile_photo, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const [result] = await db.query(sql, [
      full_name, profile_photo, Sex, Date_of_birth, 
      parents_id || null, sections_id, terms_id || null, academic_year_id || null
    ]);
    
    // Send success status
    res.status(201).json({ success: true, message: "Student registered successfully!" });
  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT s.*, p.First_Name, p.Last_Name, p.Phone_Number, sec.name as section_name, sec.grade_level, 
             t.term_name, ay.year_name
      FROM Student s
      LEFT JOIN parents p ON s.parents_id = p.id
      LEFT JOIN sections sec ON s.sections_id = sec.id
      LEFT JOIN terms t ON s.terms_id = t.id
      LEFT JOIN academic_year ay ON s.academic_year_id = ay.id
      ORDER BY s.id DESC
    `);
    res.status(200).json(students);
  } catch (error) {
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

  try {
    /* STEP 1: Basic validation */
    if (!full_name || !Sex || !Date_of_birth || !sections_id) {
      return res.status(400).json({
        error: "Required fields are missing",
      });
    }

    /* STEP 2: Get existing student */
    const [rows] = await db.query(
      "SELECT profile_photo FROM Student WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const oldPhoto = rows[0].profile_photo;

    /* STEP 3: Decide final photo */
    const finalPhoto = newPhoto || oldPhoto;

    /* STEP 4: Update database FIRST */
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

    await db.query(sql, [
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

    /* STEP 5: Delete old photo AFTER update */
    if (newPhoto && oldPhoto) {
      const oldPath = path.join(__dirname, "..", "uploads", oldPhoto);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    /* STEP 6: Success response */
    res.status(200).json({
      message: "Student updated successfully",
    });
  } catch (err) {
    console.error("Update student error:", err);
    res.status(500).json({
      error: "Failed to update student",
    });
  }
};

exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get photo filename before deleting record
    const [rows] = await db.query("SELECT profile_photo FROM Student WHERE id = ?", [id]);
    
    if (rows.length > 0 && rows[0].profile_photo) {
      const photoPath = path.join(__dirname, "..", "uploads", rows[0].profile_photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await db.query("DELETE FROM Student WHERE id = ?", [id]);
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete student" });
  }
};