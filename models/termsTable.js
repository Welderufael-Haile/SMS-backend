const db = require('../config/db')

async function createTermsTable() {
try{

// create terms table
  const sql = `
    CREATE TABLE IF NOT EXISTS terms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      academic_year_id INT NOT NULL,
      term_name VARCHAR(50) NOT NULL,
      start_date DATE,
      end_date DATE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
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