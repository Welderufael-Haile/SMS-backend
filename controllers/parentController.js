
const db = require('../config/db');

// Fetch all parents
exports.getAllParents = async (req, res) => {
    try {
        // Use execute for consistency
        const [parents] = await db.execute("SELECT * FROM parents ORDER BY created_at DESC");
        res.status(200).json(parents);
    } catch (error) {
        console.error("Error fetching parents:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Add a new parent
exports.addParent = async (req, res) => {
    try {
        const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = req.body;
        
        if (!First_Name || !Last_Name || !Sex) {
            return res.status(400).json({ message: 'First name, last name, and sex are required' });
        }
        
        // 🔹 Optimization: One query to check both email and phone
        const [existing] = await db.execute(
            'SELECT Email, Phone_Number FROM parents WHERE Email = ? OR Phone_Number = ?', 
            [Email || null, Phone_Number || null]
        );

        if (existing.length > 0) {
            const isEmailMatch = existing.some(p => p.Email === Email);
            return res.status(400).json({ 
                message: isEmailMatch ? 'Email already exists' : 'Phone number already exists' 
            });
        }
        
        const sql = 'INSERT INTO parents (First_Name, Last_Name, Sex, Phone_Number, Email, Address) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [First_Name, Last_Name, Sex, Phone_Number, Email, Address]);
        
        res.status(201).json({ message: 'Parent added successfully', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error adding parent', error: error.message });
    }
};

// Update parent
exports.updateParent = async (req, res) => {
    try {
        const { id } = req.params;
        const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = req.body;
        
        // 🔹 FIX: Check if email/phone belongs to ANOTHER parent
        const [duplicate] = await db.execute(
            'SELECT id FROM parents WHERE (Email = ? OR Phone_Number = ?) AND id != ?',
            [Email || null, Phone_Number || null, id]
        );

        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'Email or Phone Number is already taken by another parent' });
        }
        
        const sql = 'UPDATE parents SET First_Name=?, Last_Name=?, Sex=?, Phone_Number=?, Email=?, Address=? WHERE id=?';
        const [result] = await db.execute(sql, [First_Name, Last_Name, Sex, Phone_Number, Email, Address, id]);
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Parent not found' });

        res.json({ message: 'Parent updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating parent', error: error.message });
    }
};

// Delete parent
exports.deleteParent = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM parents WHERE id=?', [id]);
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Parent not found' });
        
        res.json({ message: 'Parent deleted successfully' });
    } catch (error) {
        // 🔹 Add check for Foreign Key Constraints (if parent is linked to a student)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete: This parent is still linked to a student.' });
        }
        res.status(500).json({ message: 'Error deleting parent', error: error.message });
    }
};

// Get single parent by ID
exports.getParentById = async (req, res) => {
    try {
        const [parent] = await db.execute('SELECT * FROM parents WHERE id = ?', [req.params.id]);
        if (parent.length === 0) return res.status(404).json({ message: 'Parent not found' });
        res.status(200).json(parent[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};