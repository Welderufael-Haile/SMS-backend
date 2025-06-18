const db = require('../config/db')

async function createRsultsTable() {
try{

// create terms table
  const sql = `
CREATE TABLE IF NOT EXISTS results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  section_id INT NOT NULL,
  average_score DECIMAL(5,2) NOT NULL,
  grade CHAR(1) NOT NULL,
  flag_color VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
)`;
    await db.query(sql);
    console.log("✅  results table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating results table:", error);
    throw error;
  }
 
}

// make sure to export the function
module.exports ={ createRsultsTable};