const db = require('../config/db');

async function createParentsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS parents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        First_Name VARCHAR(50) NOT NULL,
        Last_Name VARCHAR(50) NOT NULL,
        Sex VARCHAR(10) NOT NULL,
        Phone_Number VARCHAR(11),
        Email VARCHAR(100),
        Address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.query(sql); // ✅ Must run before you log success
    console.log("✅ parents table ready");
  } catch (error) {
    console.error("❌ Error creating parents table:", error);
    throw error;
  }
}

module.exports = { createParentsTable };
