//models/attendanceModel.js
const db = require("../config/db");

async function createAttendanceTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        enrollment_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present',
        marked_by INT, -- teacher_id
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (enrollment_id) 
          REFERENCES enrollments(id) 
          ON DELETE CASCADE,
          
        FOREIGN KEY (marked_by) 
          REFERENCES teachers(id) 
          ON DELETE SET NULL,
          
        UNIQUE KEY unique_attendance (enrollment_id, date),
        
        INDEX idx_attendance_date (date),
        INDEX idx_attendance_enrollment (enrollment_id),
        INDEX idx_attendance_status (status)
        
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await db.query(sql);
    console.log("✅ attendance table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating attendance table:", error);
    throw error;
  }
}

module.exports = { createAttendanceTable };