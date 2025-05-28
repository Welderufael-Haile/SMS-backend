// models/studentModel.js
const db = require("../config/db");

async function createSubjectsTable() {
  try{
    // Then create section table
    const sql = `
    CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    grade_level INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    await db.query(sql);
    console.log("✅  subjects table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
}

module.exports = { createSubjectsTable};