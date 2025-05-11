const db = require("../config/db");

// Get all announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM announcements ORDER BY post_time DESC");
    res.status(200).json(results);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new announcement
exports.createAnnouncement = async (req, res) => {
  const { title, subtitle, description, date, monday, tuesday, wednesday, thursday, friday, saturday } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO announcements (title, subtitle, description, date, monday, tuesday, wednesday, thursday, friday, saturday) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, subtitle, description, date, monday || false, tuesday || false, wednesday || false, thursday || false, friday || false, saturday || false]
    );
    res.status(201).json({ message: "Announcement created successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update an announcement
exports.updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, subtitle, description, date, monday, tuesday, wednesday, thursday, friday, saturday } = req.body;
    try {
      const [result] = await db.query(
        `UPDATE announcements 
         SET title=?, subtitle=?, description=?, date=?, monday=?, tuesday=?, wednesday=?, thursday=?, friday=?, saturday=? 
         WHERE id=?`,
        [title, subtitle, description, date, monday || false, tuesday || false, wednesday || false, thursday || false, friday || false, saturday || false, id]
      );
      res.status(200).json({ message: "Announcement updated successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ error: err.message });
    }
  };

// Delete an announcement
exports.deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM announcements WHERE id=?", [id]);
    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};