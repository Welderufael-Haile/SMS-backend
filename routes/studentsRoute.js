const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all students
router.get("/", (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add a new student
router.post("/", (req, res) => {
  const { name, email, phone, class_id } = req.body;
  db.query(
    "INSERT INTO students (name, email, phone, class_id) VALUES (?, ?, ?, ?)",
    [name, email, phone, class_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Student added successfully" });
    }
  );
});

// Promote students
router.put("/promote", (req, res) => {
  const sql = `
    UPDATE students 
    SET class_id = class_id + 1 
    WHERE class_id < 12 
    AND id IN (
        SELECT student_id FROM student_grades 
        GROUP BY student_id 
        HAVING SUM(CASE WHEN grade < 70 THEN 1 ELSE 0 END) = 0
    )`;
  db.query(sql, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Students promoted successfully" });
  });
});

module.exports = router;
