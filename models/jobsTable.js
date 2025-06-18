const db = require('../config/db')

async function createJobsTable() {
try{

// create terms table
  const sql = `CREATE TABLE IF NOT EXISTS job_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    post_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) `;
    await db.query(sql);
    console.log("✅  jobs table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating jobs table:", error);
    throw error;
  }
 
}

// make sure to export the function
module.exports ={ createJobsTable};