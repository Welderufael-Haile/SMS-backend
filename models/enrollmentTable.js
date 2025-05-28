const db = require('../config/db')

async function createEnrollmentTable() {
try{

// create terms table
  const sql = `
   CREATE TABLE IF NOT EXISTS enrollments (
   id INT AUTO_INCREMENT PRIMARY KEY,
   student_id INT NOT NULL,
   academic_year_id INT NOT NULL,
   terms_id INT NOT NULL,
   sections_id INT NOT NULL,
   FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
   FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
   FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,
   FOREIGN KEY (sections_id) REFERENCES sections(id) ON DELETE CASCADE
  )`;
    await db.query(sql);
    console.log("✅  enrollment table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating Section table:", error);
    throw error;
  }
 
}

// make sure to export the function
module.exports ={ createEnrollmentTable};