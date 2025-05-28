// models/academicyear.js
const db = require("../config/db");

async function createacademicYearTable() {
  try{
    // Then create section table
    const sql = `
     CREATE TABLE IF NOT EXISTS academic_year (
      id INT PRIMARY KEY AUTO_INCREMENT,
      year_name VARCHAR(50) NOT NULL,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    await db.query(sql);
    console.log("✅  academic-year table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
}

// Make sure to export the function
module.exports = { createacademicYearTable };
