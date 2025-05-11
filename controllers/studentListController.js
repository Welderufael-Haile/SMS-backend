const db = require("../config/db");
exports.getAllStudentsWithSections = async (req, res) => {
  const sql = `
    SELECT 
      s.id, 
      s.Full_Name, 
      s.Sex,
      s.Date_of_birth, 
      sec.name AS section_name, 
      sec.grade_level 
    FROM Student s
    JOIN sections sec ON s.Section_id = sec.id
  `;

  try {
    const [results] = await db.query(sql);
    res.status(200).json(results);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ 
      error: "Failed to fetch students",
      details: err.message
    });
  }
};