// models/studentModel.js
const db = require("../config/db");

async function createSectionsTable() {
  try{
    // Then create section table
    const sql = `
    CREATE TABLE IF NOT EXISTS sections (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      grade_level INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    await db.query(sql);
    console.log("✅  sections table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
}

// Make sure to export the function
module.exports = { createSectionsTable };
