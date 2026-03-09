// models/attendanceSummaryModel.js
const db = require("../config/db");

async function createAttendanceSummaryTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS attendance_summary (
        id INT PRIMARY KEY AUTO_INCREMENT,
        enrollment_id INT NOT NULL,
        total_present INT DEFAULT 0,
        total_absent INT DEFAULT 0,
        total_late INT DEFAULT 0,
        total_excused INT DEFAULT 0,
        total_days INT DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (enrollment_id) 
          REFERENCES enrollments(id) 
          ON DELETE CASCADE,
          
        UNIQUE KEY unique_enrollment_summary (enrollment_id)
        
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await db.query(sql);
    console.log("✅ attendance_summary table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating attendance_summary table:", error);
    throw error;
  }
}

module.exports = { createAttendanceSummaryTable };