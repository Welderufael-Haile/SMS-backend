const db = require('../config/db')

async function createContactsTable() {
try{

// create terms table
  const sql = `
  CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
    await db.query(sql);
    console.log("✅  contacts table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating contacts table:", error);
    throw error;
  }
}

// make sure to export the function
module.exports ={ createContactsTable};