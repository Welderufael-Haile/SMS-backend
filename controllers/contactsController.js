const db = require("../config/db");

// Store a contact message
const submitContactForm = async (req, res) => {
  try {
    const { full_name, phone_number, email, message } = req.body;

    if (!full_name || !phone_number || !email || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const sql = "INSERT INTO contacts (full_name, phone_number, email, message) VALUES (?, ?, ?, ?)";
    const values = [full_name, phone_number, email, message];

    await db.query(sql, values);
    res.status(201).json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Error saving contact:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Fetch all messages
const getAllContacts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM contacts ORDER BY created_at DESC");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Delete a message
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM contacts WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Message not found." });
    }

    res.status(200).json({ success: true, message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

module.exports = { submitContactForm, getAllContacts, deleteContact };
