const db = require('../config/db')

async function createMarksTable() {
try{

// create terms table
  const sql = `
  CREATE TABLE IF NOT EXISTS marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollments_id INT NOT NULL,
  subjects_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (enrollments_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (subjects_id) REFERENCES subjects(id) ON DELETE CASCADE
 )`;
    await db.query(sql);
    console.log("✅  marks table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
}

// make sure to export the function
module.exports ={ createMarksTable};