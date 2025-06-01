// models/studentModel.js
const db = require("../config/db");

async function createTeachesTable() {
  try{
    // Then create section table
    const sql = `
   CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100),
  email VARCHAR(100),
  gender VARCHAR(10),
  phone_number VARCHAR(15),
  Subject VARCHAR(100),
  address VARCHAR(255),
  profile_photo VARCHAR(255),
  degree_certificate VARCHAR(255),
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

module.exports = { createTeachesTable};