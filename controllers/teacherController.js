// controllers/teacherController.js
const path = require("path");
const fs = require("fs");
const db = require("../config/db"); // adjust if your DB connection file path differs

// CREATE a new teacher
exports.createTeacher = async (req, res) => {
  const {
    full_name,
    email,
    gender,
    phone_number,
    subject,
    grade_level,
    address,
  } = req.body;

  const profile_photo = req.files?.profile_photo?.[0]?.filename || null;
  const degree_certificate = req.files?.degree_certificate?.[0]?.filename || null;

  try {
    const sql = `
      INSERT INTO teachers (full_name, email, gender, phone_number, Subject, address, profile_photo, degree_certificate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      full_name,
      email,
      gender,
      phone_number,
      subject,
      grade_level,
      address,
      profile_photo,
      degree_certificate,
    ]);

    res.status(201).json({ message: "Teacher created successfully" });
  } catch (err) {
    console.error("Error creating teacher:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM teachers ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET one teacher
exports.getTeacherById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM teachers WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching teacher:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// UPDATE teacher
exports.updateTeacher = async (req, res) => {
  const { id } = req.params;
  const {
    full_name,
    email,
    gender,
    phone_number,
    subject,
    grade_level,
    address,
  } = req.body;

  const profile_photo = req.files?.profile_photo?.[0]?.filename;
  const degree_certificate = req.files?.degree_certificate?.[0]?.filename;

  try {
    const [existing] = await db.query("SELECT * FROM teachers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const teacher = existing[0];

    const updatedPhoto = profile_photo || teacher.profile_photo;
    const updatedDegree = degree_certificate || teacher.degree_certificate;

    const sql = `
      UPDATE teachers
      SET full_name = ?, email = ?, gender = ?, phone_number = ?, Subject = ?, address = ?, profile_photo = ?, degree_certificate = ?
      WHERE id = ?
    `;

    await db.query(sql, [
      full_name,
      email,
      gender,
      phone_number,
      subject,
      grade_level,
      address,
      updatedPhoto,
      updatedDegree,
      id,
    ]);

    res.json({ message: "Teacher updated successfully" });
  } catch (err) {
    console.error("Error updating teacher:", err);
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

    // Optionally delete files
    if (teacher.profile_photo) {
      fs.unlink(path.join("uploads", teacher.profile_photo), () => {});
    }

    if (teacher.degree_certificate) {
      fs.unlink(path.join("uploads", teacher.degree_certificate), () => {});
    }

    await db.query("DELETE FROM teachers WHERE id = ?", [id]);
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};