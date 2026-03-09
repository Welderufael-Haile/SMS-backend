
// controllers/announcementController.js
const db = require("../config/db");

// Get all announcements (public - no view increment)
exports.getAnnouncements = async (req, res) => {

  try {
    const { category, priority, target, pinned } = req.query;
    
    let query = "SELECT * FROM announcements WHERE 1=1";
    const params = [];
    
    // Only add expiry filter if we're not showing expired ones
    if (!req.query.showExpired) {
      query += " AND (expiry_date IS NULL OR expiry_date >= CURDATE())";
    }
    
    if (category && category !== 'all') {
      query += " AND category = ?";
      params.push(category);
    }
    
    if (priority && priority !== 'all') {
      query += " AND priority = ?";
      params.push(priority);
    }
    
    if (target && target !== 'all') {
      query += " AND (target_audience = 'all' OR target_audience = ?)";
      params.push(target);
    }
    
    if (pinned === 'true') {
      query += " AND is_pinned = true";
    }
    
    query += " ORDER BY is_pinned DESC, FIELD(priority, 'urgent', 'high', 'medium', 'low'), post_time DESC";
    
    const [results] = await db.query(query, params);
    res.status(200).json(results);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
};

// Create a new announcement
exports.createAnnouncement = async (req, res) => {
  const { 
    title, 
    subtitle, 
    description, 
    category, 
    priority, 
    target_audience, 
    is_pinned, 
    expiry_date 
  } = req.body;

  // Validate
  const errors = [];
  if (!title || title.trim() === '') errors.push("Title is required");
  if (!description || description.trim() === '') errors.push("Description is required");
  if (errors.length > 0) return res.status(400).json({ error: errors.join(", ") });

  try {
    let formattedExpiryDate = null;
    if (expiry_date && expiry_date.trim() !== '') {
      const date = new Date(expiry_date);
      if (!isNaN(date.getTime())) formattedExpiryDate = date.toISOString().split('T')[0];
    }

    const [result] = await db.query(
      `INSERT INTO announcements 
       (title, subtitle, description, category, priority, target_audience, is_pinned, expiry_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), subtitle?.trim() || null, description.trim(), category || 'general', priority || 'medium', target_audience || 'all', is_pinned === true || is_pinned === 'true', formattedExpiryDate]
    );

    // Get the newly created announcement with all details
    const [newAnnouncement] = await db.query(
      "SELECT * FROM announcements WHERE id = ?", 
      [result.insertId]
    );

    // 🔥 EMIT TO SPECIFIC ROOMS BASED ON TARGET AUDIENCE
    const io = req.app.get('socketio');
    
    // Prepare announcement data
    const announcementData = {
      id: newAnnouncement[0].id,
      title: title.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      target_audience: target_audience || 'all',
      timestamp: new Date().toISOString()
    };

    // Emit to appropriate rooms
    if (target_audience === 'all' || target_audience === 'everyone') {
      // Emit to all rooms
      io.emit('new_announcement', announcementData);
      console.log('📢 Emitted to all rooms');
    } else {
      // Emit to specific role room
      io.to(target_audience).emit('new_announcement', announcementData);
      console.log(`📢 Emitted to ${target_audience} room`);
    }

    res.status(201).json({ 
      message: "Announcement created successfully", 
      id: result.insertId 
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
};

// Get single announcement with view increment
exports.getAnnouncementById = async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: "Invalid announcement ID" });
  
  try {
    const [check] = await db.query("SELECT id FROM announcements WHERE id = ?", [id]);
    if (check.length === 0) return res.status(404).json({ error: "Announcement not found" });
    
    // Increment views
    await db.query("UPDATE announcements SET views = views + 1 WHERE id = ?", [id]);
    
    // Fetch fresh data with updated views
    const [results] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    const announcement = results[0];

    // 🔥 EMIT VIEW UPDATE TO ADMIN/TEACHER ROOMS
    try {
      const io = req.app.get('socketio');
      if (io) {
        // Emit to admin and teacher rooms
        io.to('admin').to('teacher').emit('view_updated', { 
          id: announcement.id, 
          newViews: announcement.views 
        });
        console.log(`👁️ View update emitted for announcement ${id}: ${announcement.views} views`);
      }
    } catch (socketErr) {
      console.error("Socket emit error (non-critical):", socketErr);
    }

    res.status(200).json(announcement);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
};
// Update an announcement
exports.updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    subtitle, 
    description, 
    category, 
    priority, 
    target_audience, 
    is_pinned, 
    expiry_date 
  } = req.body;

  // Validate ID
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid announcement ID" });
  }

  // Validate required fields
  const errors = [];
  if (!title || title.trim() === '') errors.push("Title is required");
  if (!description || description.trim() === '') errors.push("Description is required");
  
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  try {
    // Check if announcement exists
    const [check] = await db.query("SELECT id FROM announcements WHERE id = ?", [id]);
    
    if (check.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    // Format expiry_date properly for MySQL
    let formattedExpiryDate = null;
    if (expiry_date && expiry_date.trim() !== '') {
      // Convert to YYYY-MM-DD format
      const date = new Date(expiry_date);
      if (!isNaN(date.getTime())) {
        formattedExpiryDate = date.toISOString().split('T')[0];
      }
    }

    const [result] = await db.query(
      `UPDATE announcements 
       SET title=?, subtitle=?, description=?, category=?, priority=?, 
           target_audience=?, is_pinned=?, expiry_date=?
       WHERE id=?`,
      [
        title.trim(), 
        subtitle?.trim() || null, 
        description.trim(), 
        category || 'general', 
        priority || 'medium', 
        target_audience || 'all', 
        is_pinned === true || is_pinned === 'true' ? true : false,
        formattedExpiryDate,
        id
      ]
    );
    
    res.status(200).json({ message: "Announcement updated successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to update announcement" });
  }
};

// Delete an announcement
exports.deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  
  // Validate ID
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid announcement ID" });
  }
  
  try {
    // Check if announcement exists
    const [check] = await db.query("SELECT id FROM announcements WHERE id = ?", [id]);
    
    if (check.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    const [result] = await db.query("DELETE FROM announcements WHERE id=?", [id]);
    
    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
};

// Pin/unpin announcement
exports.togglePin = async (req, res) => {
  const { id } = req.params;
  
  // Validate ID
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid announcement ID" });
  }
  
  try {
    const [announcement] = await db.query("SELECT is_pinned FROM announcements WHERE id = ?", [id]);
    
    if (announcement.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    const newPinState = !announcement[0].is_pinned;
    
    await db.query("UPDATE announcements SET is_pinned = ? WHERE id = ?", [newPinState, id]);
    
    res.status(200).json({ 
      message: newPinState ? "Announcement pinned" : "Announcement unpinned",
      is_pinned: newPinState
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to update pin status" });
  }
};

// Get announcements stats (FIXED - this was missing)
exports.getAnnouncementStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_pinned = true THEN 1 ELSE 0 END) as pinned,
        SUM(CASE WHEN category = 'general' THEN 1 ELSE 0 END) as general,
        SUM(CASE WHEN category = 'academic' THEN 1 ELSE 0 END) as academic,
        SUM(CASE WHEN category = 'event' THEN 1 ELSE 0 END) as events,
        SUM(CASE WHEN category = 'holiday' THEN 1 ELSE 0 END) as holiday,
        SUM(CASE WHEN category = 'emergency' THEN 1 ELSE 0 END) as emergency,
        SUM(views) as total_views,
        COALESCE(AVG(views), 0) as avg_views
      FROM announcements 
      WHERE expiry_date IS NULL OR expiry_date >= CURDATE()
    `);
    
    res.status(200).json(stats[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};