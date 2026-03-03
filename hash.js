// // hash.js
// const bcrypt = require('bcrypt');
// bcrypt.hash('well123', 10).then(console.log);
// //$2b$10$gq/nc7UkulW/xHcVzyYkkuYDtcA3AkqUKxhXoiArzLuNLn6afXrau

// scripts/linkStudentsToUsers.js
const db = require('./config/db');

async function linkStudentsToUsers() {
  try {
    console.log("🔗 Linking students to user accounts...");
    
    // Get all students that don't have user_id
    const [students] = await db.query(`
      SELECT s.*, u.id as user_id 
      FROM Student s
      LEFT JOIN Users u ON u.email = CONCAT(s.full_name, '@student.com')  -- Adjust as needed
      WHERE s.user_id IS NULL
    `);
    
    console.log(`Found ${students.length} students to link`);
    
    for (const student of students) {
      // Create a user account for the student if it doesn't exist
      const [existingUser] = await db.query(
        'SELECT id FROM Users WHERE email = ?',
        [`${student.full_name.toLowerCase().replace(/\s+/g, '.')}@student.com`]
      );
      
      if (existingUser.length === 0) {
        // Create new user
        const [result] = await db.query(
          `INSERT INTO Users (full_name, email, password, role, status) 
           VALUES (?, ?, ?, 'student', 'active')`,
          [student.full_name, `${student.full_name.toLowerCase().replace(/\s+/g, '.')}@student.com`, 
           '$2b$10$YourHashedPasswordHere'] // You'd need proper password hashing
        );
        
        // Link student to user
        await db.query(
          'UPDATE Student SET user_id = ? WHERE id = ?',
          [result.insertId, student.id]
        );
        
        console.log(`✅ Linked student ${student.full_name} to user ID ${result.insertId}`);
      } else {
        // Link existing user
        await db.query(
          'UPDATE Student SET user_id = ? WHERE id = ?',
          [existingUser[0].id, student.id]
        );
        console.log(`✅ Linked student ${student.full_name} to existing user ID ${existingUser[0].id}`);
      }
    }
    
    console.log("✅ All students linked successfully!");
    
  } catch (error) {
    console.error("❌ Error linking students:", error);
  } finally {
    process.exit();
  }
}

linkStudentsToUsers();