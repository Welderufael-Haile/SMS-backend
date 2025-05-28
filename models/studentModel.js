// models/studentModel.js
const db = require("../config/db");

async function createStudentTable() {
  try {
   
    // Then create Student table
    const sql = `
      CREATE TABLE IF NOT EXISTS Student (
        id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(50),
        Sex VARCHAR(50),
        Date_of_birth DATE,
        ParentID INT,
        sections_id INT,
        terms_id INT,
        academic_year_id INT,
        FOREIGN KEY (ParentID) REFERENCES Parent(ParentID) ON DELETE CASCADE,
        FOREIGN KEY (sections_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE
      )`;
    
    await db.query(sql);
    console.log("✅ Student table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Student table:", error);
    throw error;
  }
}

// Make sure to export the function
module.exports = { createStudentTable };