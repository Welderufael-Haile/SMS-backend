const db = require('../config/db')

async function createApplicantsTable() {
try{

// create terms table
  const sql = `
CREATE TABLE IF NOT EXISTS job_applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position VARCHAR(100) NOT NULL,
    Sex VARCHAR(50),
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    cv_path VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
     `;
    await db.query(sql);
    console.log("✅  job_applications table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating job_applications table:", error);
    throw error;
  }
 
}


// make sure to export the function
module.exports ={ createApplicantsTable};