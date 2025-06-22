// models/studentModel.js
const db = require("../config/db");

async function createTeacher_subjectsTable() {
  try{
    // Then create section table
 const sql = `
  CREATE TABLE IF NOT EXISTS teacher_subjects (
   teacher_id INT,
   subject_id INT,
   PRIMARY KEY (teacher_id, subject_id),
   FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
   FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
 )`;
    
    await db.query(sql);
    console.log("✅  teacher_subjects table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating teacher_subjects table:", error);
    throw error;
  }
}

module.exports = { createTeacher_subjectsTable};