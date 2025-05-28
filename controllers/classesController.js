const db = require("../config/db");

exports.getAllClasses = async (req, res) => {
  try {
    const [classes] = await db.query(`
      SELECT c.*, s.name as section_name, s.grade_level, 
             t.term_name, ay.year_name, 
             COUNT(st.id) as student_count
      FROM classes c
      LEFT JOIN sections s ON c.section_id = s.id
      LEFT JOIN terms t ON c.term_id = t.id
      LEFT JOIN academic_year ay ON c.academic_year_id = ay.id
      LEFT JOIN student st ON st.sections_id = c.section_id 
                          AND st.terms_id = c.term_id
                          AND st.academic_year_id = c.academic_year_id
      GROUP BY c.id, s.name, s.grade_level, t.term_name, ay.year_name
    `);
    res.status(200).json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getClassById = async (req, res) => {
  const { id } = req.params;
  try {
    const [classData] = await db.query(`
      SELECT c.*, s.name as section_name, s.grade_level, 
             t.term_name, ay.year_name
      FROM classes c
      LEFT JOIN sections s ON c.section_id = s.id
      LEFT JOIN terms t ON c.term_id = t.id
      LEFT JOIN academic_year ay ON c.academic_year_id = ay.id
      WHERE c.id = ?
    `, [id]);
    
    if (classData.length === 0) {
      return res.status(404).json({ message: "Class not found" });
    }
    
    res.status(200).json(classData[0]);
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getClassStudents = async (req, res) => {
  const { id } = req.params;
  try {
    // First get the class details to know section, term, and academic year
    const [classData] = await db.query("SELECT * FROM classes WHERE id = ?", [id]);
    
    if (classData.length === 0) {
      return res.status(404).json({ message: "Class not found" });
    }
    
    const classInfo = classData[0];
    
    // Then get all students in that class
    const [students] = await db.query(`
      SELECT s.*, p.First_Name as parent_first_name, p.Last_Name as parent_last_name
      FROM student s
      LEFT JOIN Parent p ON s.ParentID = p.ParentID
      WHERE s.sections_id = ? AND s.terms_id = ? AND s.academic_year_id = ?
    `, [classInfo.section_id, classInfo.term_id, classInfo.academic_year_id]);
    
    res.status(200).json({
      classInfo,
      students
    });
  } catch (error) {
    console.error("Error fetching class students:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
