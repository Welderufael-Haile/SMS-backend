const db = require('../config/db')

async function createParentTable() {
try{
  const sql = `
    CREATE TABLE IF NOT EXISTS Parent (
      ParentID INT PRIMARY KEY AUTO_INCREMENT,
      First_Name VARCHAR(50) NOT NULL,
      Last_Name VARCHAR(50) NOT NULL,
      Sex VARCHAR(10) NOT NULL,
      Phone_Number VARCHAR(11),
      Email VARCHAR(100),
      Address VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    console.log("✅  parent table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating parent table:", error);
    throw error;
  }
  await db.query(sql);
}

// make sure to export the function
module.exports ={ createParentTable};