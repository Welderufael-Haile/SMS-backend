const db = require('../config/db')

async function createUserTable() {
try{

// create terms table
  const sql = `
   CREATE TABLE IF NOT EXISTS Users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;
    await db.query(sql);
    console.log("✅  user table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating user table:", error);
    throw error;
  }
 
}

// make sure to export the function
module.exports ={ createUserTable};