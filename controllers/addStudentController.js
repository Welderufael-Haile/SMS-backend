
// // controllers/addStudentController.js
// const db = require("../config/db"); // Your MySQL connection

// // Add student
// exports.addStudent = (req, res) => {
//   const { full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id } = req.body;

//   const sql = "INSERT INTO Student (full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
//   db.query(sql, [full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id], (err, result) => {
//     if (err) return res.status(500).json({ error: "Failed to add student", details: err });
//     res.status(201).json({ message: "Student added successfully", studentId: result.insertId });
//   });
// };

// // Fetch all students with their section and parent
// exports.getAllStudents = async (req, res) => {
//   try {
//     const [students] = await db.query(`
//       SELECT s.*, p.*, sec.*, t.*, ay.* 
//       FROM Student s
//       LEFT JOIN Parent p ON s.ParentID = p.ParentID
//       LEFT JOIN sections sec ON s.sections_id = sec.id
//       LEFT JOIN terms t ON s.terms_id = t.id
//       LEFT JOIN academic_year ay ON s.academic_year_id = ay.id
//     `);
//     res.status(200).json(students);
//   } catch (error) {
//     console.error("Error fetching students:", error);
//     res.status(500).json({ message: "Server Error", error });
//   }
// };

// // Delete student
// exports.deleteStudent = (req, res) => {
//   const { id } = req.params;
//   db.query("DELETE FROM Student WHERE id = ?", [id], (err) => {
//     if (err) return res.status(500).json({ error: "Failed to delete student", details: err });
//     res.json({ message: "Student deleted successfully" });
//   });
// };

// // Update student
// exports.updateStudent = (req, res) => {
//   const { id } = req.params;
//   const { full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id } = req.body;

//   const sql = `UPDATE Student SET 
//     full_name = ?, 
//     Sex = ?, 
//     Date_of_birth = ?, 
//     ParentID = ?, 
//     sections_id = ?, 
//     terms_id = ?, 
//     academic_year_id = ? 
//     WHERE id = ?`;
    
//   db.query(sql, [full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id, id], (err) => {
//     if (err) return res.status(500).json({ error: "Failed to update student", details: err });
//     res.json({ message: "Student updated successfully" });
//   });
// };





const db = require("../config/db");

exports.addStudent = async (req, res) => {
  const { full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id } = req.body;

  try {
    const sql = "INSERT INTO Student (full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const [result] = await db.query(sql, [full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id]);
    res.status(201).json({ message: "Student added successfully", studentId: result.insertId });
  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ error: "Failed to add student", details: err.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT s.*, p.First_Name, p.Last_Name, sec.name as section_name, sec.grade_level, 
             t.term_name, ay.year_name
      FROM Student s
      LEFT JOIN Parent p ON s.ParentID = p.ParentID
      LEFT JOIN sections sec ON s.sections_id = sec.id
      LEFT JOIN terms t ON s.terms_id = t.id
      LEFT JOIN academic_year ay ON s.academic_year_id = ay.id
    `);
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM Student WHERE id = ?", [id]);
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ error: "Failed to delete student", details: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const { full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id } = req.body;

  try {
    const sql = `UPDATE Student SET 
      full_name = ?, 
      Sex = ?, 
      Date_of_birth = ?, 
      ParentID = ?, 
      sections_id = ?, 
      terms_id = ?, 
      academic_year_id = ? 
      WHERE id = ?`;
    
    await db.query(sql, [full_name, Sex, Date_of_birth, ParentID, sections_id, terms_id, academic_year_id, id]);
    res.status(200).json({ message: "Student updated successfully" });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Failed to update student", details: err.message });
  }
};