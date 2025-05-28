const db = require('../config/db')

async function createTermsTable() {
try{

// create terms table
  const sql = `
    CREATE TABLE IF NOT EXISTS terms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      term_name VARCHAR(50) NOT NULL,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await db.query(sql);
    console.log("✅  terms table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
 
}

// make sure to export the function
module.exports ={ createTermsTable};