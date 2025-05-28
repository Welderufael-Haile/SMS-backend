const db = require('../config/db')

async function createMarklistTable() {
try{

// create terms table
  const sql = `
  CREATE TABLE IF NOT EXISTS marklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Sex ENUM('M', 'F') NOT NULL,
  Term VARCHAR(20) NOT NULL, 
  Year  VARCHAR(20) NOT NULL,
  Tigrigna FLOAT DEFAULT 0,
  Amharic FLOAT DEFAULT 0,
  English FLOAT DEFAULT 0,
  Maths FLOAT DEFAULT 0,
  Biology FLOAT DEFAULT 0,
  Chemistry FLOAT DEFAULT 0,
  Physics FLOAT DEFAULT 0,
  Geography FLOAT DEFAULT 0,
  History FLOAT DEFAULT 0,
  Economics FLOAT DEFAULT 0,
  Citizenship FLOAT DEFAULT 0,
  ICT FLOAT DEFAULT 0,
  HPE FLOAT DEFAULT 0,
  Total FLOAT DEFAULT 0,
  Average FLOAT DEFAULT 0,
  Flag ENUM('green', 'blue', 'yellow', 'red') DEFAULT 'green',
  Rank INT DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 )`;
    await db.query(sql);
    console.log("✅  marklist table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
}

// make sure to export the function
module.exports ={ createMarklistTable};