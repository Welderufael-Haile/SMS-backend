const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

// Register a new user (admin only)
exports.register = async (req, res) => {
  const { full_name, email, password, role, status } = req.body;
  
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters and include a letter, a number, and a special character." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO Users (full_name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, hashedPassword, role, status || 'active']
    );
    res.status(201).json({ message: 'User Registration successful.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Email already exists." });
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Login (Only active users)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [[user]] = await pool.query("SELECT * FROM Users WHERE email = ?", [email]);
    const genericError = "Invalid email or password.";

    if (!user) return res.status(401).json({ error: genericError });

    // 🔹 CHECK STATUS: Prevent inactive/suspended users from logging in
    if (user.status !== 'active') {
      return res.status(403).json({ error: `Your account is ${user.status}. Please contact support.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: genericError });

    // 🔹 UPDATE LAST LOGIN: Track activity
    await pool.query("UPDATE Users SET last_login = NOW() WHERE id = ?", [user.id]);

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '30m' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000 // Match JWT 30 mins
    });

    res.json({ message: 'Login successful', user: { id: user.id, role: user.role, name: user.full_name } });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// Get all users (Admin view)
exports.getUsers = async (req, res) => {
  try {
    // 🔹 Fetch status and last_login for the management table
    const [users] = await pool.query(
      "SELECT id, full_name, email, role, status, last_login, created_at FROM Users ORDER BY created_at DESC"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

// Update user (Admin view)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role, password, status } = req.body;

  try {
    const [existing] = await pool.query("SELECT id FROM Users WHERE email = ? AND id != ?", [email, id]);
    if (existing.length > 0) return res.status(400).json({ error: "Email already in use." });

    if (password && password.trim() !== "") {
      if (!passwordRegex.test(password)) return res.status(400).json({ error: "Weak new password." });
      const hashedPassword = await bcrypt.hash(password, 12);
      await pool.query(
        "UPDATE Users SET full_name = ?, email = ?, role = ?, password = ?, status = ? WHERE id = ?",
        [full_name, email, role, hashedPassword, status, id]
      );
    } else {
      await pool.query(
        "UPDATE Users SET full_name = ?, email = ?, role = ?, status = ? WHERE id = ?",
        [full_name, email, role, status, id]
      );
    }
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
};

// Delete user (Admin only + Safety check)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id; // From verifyToken middleware

  if (parseInt(id) === adminId) {
    return res.status(400).json({ error: "You cannot delete your own admin account!" });
  }

  try {
    await pool.query("DELETE FROM Users WHERE id = ?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed." });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};