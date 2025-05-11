// controllers/addStudentController.js
const db = require("../config/db"); // Your MySQL connection

// Add student
exports.addStudent = (req, res) => {
  const { full_name,Sex, Date_of_birth, section_id, ParentID } = req.body;

  const sql = "INSERT INTO student (full_name,Sex, Date_of_birth, Section_id, ParentID) VALUES (?, ?, ?, ?,?)";
  db.query(sql, [full_name,Sex, Date_of_birth, section_id, ParentID], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to add student", details: err });
    res.status(201).json({ message: "Student added successfully", studentId: result.insertId });
  });
};

// Fetch all students with their section and parent
exports.getAllStudents = async (req, res) => {
  try {
          const [student] = await db.query("SELECT * FROM student"); // Use async/await
          res.status(200).json(student);
      } catch (error) {
          console.error("Error fetching parents:", error);
          res.status(500).json({ message: "Server Error", error });
      }
  };
// Delete student
exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM student WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete student", details: err });
    res.json({ message: "Student deleted successfully" });
  });
};

// Update student
exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const { full_name, Sex, Date_of_birth, section_id, ParentID } = req.body;

  const sql = `UPDATE student SET full_name = ?, Sex = ?, Date_of_birth = ?, section_id = ?, ParentID = ? WHERE id = ?`;
  db.query(sql, [full_name, Sex, Date_of_birth, section_id, ParentID, id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to update student", details: err });
    res.json({ message: "Student updated successfully" });
  });
};
