
const db = require('../config/db')

async function createAnnouncementTable() {
try{

// create announcement table
  const sql = `
   CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT NOT NULL,
    date DATE,
    post_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monday VARCHAR(255) NOT NULL,
    tuesday VARCHAR(255) NOT NULL,
    wednesday VARCHAR(255) NOT NULL,
    thursday VARCHAR(255) NOT NULL,
    friday VARCHAR(255) NOT NULL,
    saturday VARCHAR(255) NOT NULL,
    post_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
    await db.query(sql);
    console.log("✅  announcement table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating announcements table:", error);
    throw error;
  }
 
}

// make sure to export the function
module.exports ={ createAnnouncementTable};