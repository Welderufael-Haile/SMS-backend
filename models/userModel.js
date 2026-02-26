const db = require('../config/db')

async function createUserTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS Users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'teacher', 'student') NOT NULL,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active', 
        last_login TIMESTAMP NULL DEFAULT NULL,                          
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await db.query(sql);
    console.log("✅ User table with status ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating user table:", error);
    throw error;
  }
}

module.exports = { createUserTable };