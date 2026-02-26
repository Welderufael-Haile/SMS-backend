const db = require("../config/db");

async function createSectionsTable() {
  try {
    const sql = `
    CREATE TABLE IF NOT EXISTS sections (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      grade_level INT NOT NULL,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    
    await db.query(sql);
    console.log("✅ sections table ready with status field");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
}

module.exports = { createSectionsTable };