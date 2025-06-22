const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
//console.log("JWT_SECRET is:", SECRET);

// Register (admin only)
exports.register = async (req, res) => {
  const { full_name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO Users (full_name, email, password, role) VALUES (?, ?, ?, ?)",
      [full_name, email, hashedPassword, role]
    );
    res.status(201).json({ message: 'User Registration successful.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [[user]] = await pool.query("SELECT * FROM Users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Login successful', user: { id: user.id, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};


// Get users (with optional search query)
exports.getUsers = async (req, res) => {
  const search = req.query.search || '';
  try {
    const [users] = await pool.query(
      "SELECT id, full_name, email, role FROM Users WHERE full_name LIKE ? OR email LIKE ?",
      [`%${search}%`, `%${search}%`]
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a user (admin only)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM Users WHERE id = ?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// update user

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role, password } = req.body;

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE Users SET full_name = ?, email = ?, role = ?, password = ? WHERE id = ?",
        [full_name, email, role, hashedPassword, id]
      );
    } else {
      await pool.query(
        "UPDATE Users SET full_name = ?, email = ?, role = ? WHERE id = ?",
        [full_name, email, role, id]
      );
    }

    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
