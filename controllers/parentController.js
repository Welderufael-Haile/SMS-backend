// controllers/parentController.js
const db = require('../config/db');

// Fetch all parents
exports.getAllParents = async (req, res) => {
    try {
        const [parents] = await db.query("SELECT * FROM parents ORDER BY created_at DESC");
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
        
        // Validate required fields
        if (!First_Name || !Last_Name || !Sex) {
            return res.status(400).json({ message: 'First name, last name, and sex are required' });
        }
        
        // Check if email already exists
        if (Email) {
            const [existingEmail] = await db.execute('SELECT * FROM parents WHERE Email = ?', [Email]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ message: 'A parent with this email already exists' });
            }
        }
        
        // Check if phone number already exists
        if (Phone_Number) {
            const [existingPhone] = await db.execute('SELECT * FROM parents WHERE Phone_Number = ?', [Phone_Number]);
            if (existingPhone.length > 0) {
                return res.status(400).json({ message: 'A parent with this phone number already exists' });
            }
        }
        
        const sql = 'INSERT INTO parents (First_Name, Last_Name, Sex, Phone_Number, Email, Address) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [First_Name, Last_Name, Sex, Phone_Number, Email, Address]);
        
        res.status(201).json({ 
            message: 'Parent added successfully', 
            parentId: result.insertId 
        });
    } catch (error) {
        console.error("Error adding parent:", error);
        
        // Handle duplicate entry error (in case unique constraints are set in DB)
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('Email')) {
                return res.status(400).json({ message: 'A parent with this email already exists' });
            } else if (error.sqlMessage.includes('Phone_Number')) {
                return res.status(400).json({ message: 'A parent with this phone number already exists' });
            }
        }
        
        res.status(500).json({ message: 'Error adding parent', error: error.message });
    }
};

// Update parent
exports.updateParent = async (req, res) => {
    try {
        const { id } = req.params;
        const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = req.body;
        
        // Check if parent exists
        const [existingParent] = await db.execute('SELECT * FROM parents WHERE id = ?', [id]);
        if (existingParent.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        const sql = 'UPDATE parents SET First_Name=?, Last_Name=?, Sex=?, Phone_Number=?, Email=?, Address=? WHERE id=?';
        await db.execute(sql, [First_Name, Last_Name, Sex, Phone_Number, Email, Address, id]);
        
        res.json({ message: 'Parent updated successfully' });
    } catch (error) {
        console.error("Error updating parent:", error);
        
        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'A parent with this email or phone number already exists' });
        }
        
        res.status(500).json({ message: 'Error updating parent', error: error.message });
    }
};

// Delete parent
exports.deleteParent = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if parent exists
        const [existingParent] = await db.execute('SELECT * FROM parents WHERE id = ?', [id]);
        if (existingParent.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        await db.execute('DELETE FROM parents WHERE id=?', [id]);
        
        res.json({ message: 'Parent deleted successfully' });
    } catch (error) {
        console.error("Error deleting parent:", error);
        res.status(500).json({ message: 'Error deleting parent', error: error.message });
    }
};

// Get single parent by ID
exports.getParentById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [parent] = await db.execute('SELECT * FROM parents WHERE id = ?', [id]);
        
        if (parent.length === 0) {
            return res.status(404).json({ message: 'Parent not found' });
        }
        
        res.status(200).json(parent[0]);
    } catch (error) {
        console.error("Error fetching parent:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};