// const db = require('../config/db')

// async function createMarksTable() {
// try{

// // create terms table
//   const sql = `
//   CREATE TABLE IF NOT EXISTS marks (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   enrollments_id INT NOT NULL,
//   subjects_id INT NOT NULL,
//   score DECIMAL(5,2) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (enrollments_id) REFERENCES enrollments(id) ON DELETE CASCADE,
//   FOREIGN KEY (subjects_id) REFERENCES subjects(id) ON DELETE CASCADE
//  )`;
//     await db.query(sql);
//     console.log("✅  marks table ready");
//     return true;
//   } catch (error) {
//     console.error("❌ Error creating Marks table:", error);
//     throw error;
//   }
// }

// // make sure to export the function
// module.exports ={ createMarksTable};

const db = require('../config/db');

async function createMarksTable() {
  try {
    const sql = `
    CREATE TABLE IF NOT EXISTS marks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      enrollments_id INT NOT NULL,
      subjects_id INT NOT NULL,
      
      -- Assessment Columns (Optional/Nullable as requested)
      st1 DECIMAL(5,2) DEFAULT NULL,        -- 10%
      ws DECIMAL(5,2) DEFAULT NULL,         -- 10%
      mid_exam DECIMAL(5,2) DEFAULT NULL,   -- 20%
      project DECIMAL(5,2) DEFAULT NULL,    -- 10%
      st2 DECIMAL(5,2) DEFAULT NULL,        -- 10%
      home_class_work DECIMAL(5,2) DEFAULT NULL, -- 5%
      class_activity DECIMAL(5,2) DEFAULT NULL,  -- 5% (EX.B)
      final_exam DECIMAL(5,2) DEFAULT NULL, -- 30%
      
      -- Auto-calculated Total (Virtual Column)
      -- This sums the values, treating NULL as 0
      total_score DECIMAL(5,2) AS (
        COALESCE(st1, 0) + 
        COALESCE(ws, 0) + 
        COALESCE(mid_exam, 0) + 
        COALESCE(project, 0) + 
        COALESCE(st2, 0) + 
        COALESCE(home_class_work, 0) + 
        COALESCE(class_activity, 0) + 
        COALESCE(final_exam, 0)
      ) STORED,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (enrollments_id) REFERENCES enrollments(id) ON DELETE CASCADE,
      FOREIGN KEY (subjects_id) REFERENCES subjects(id) ON DELETE CASCADE,
      
      -- Ensure a student doesn't have duplicate marks for the same subject in one enrollment
      UNIQUE KEY unique_student_subject (enrollments_id, subjects_id)
    )`;

    await db.query(sql);
    console.log("✅ Marks table updated with individual assessment rows and auto-total");
    return true;
  } catch (error) {
    console.error("❌ Error creating Marks table:", error);
    throw error;
  }
}

module.exports = { createMarksTable };