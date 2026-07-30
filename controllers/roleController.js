const prisma = require('../config/prisma');

// Fetch all roles
exports.getAllRoles = async (req, res) => {
  try {
    if (!prisma.roles) {
      return res.status(500).json({ error: "Roles model not found. Please run 'npx prisma db push' to generate the Prisma client." });
    }
    const roles = await prisma.roles.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name) return res.status(400).json({ error: "Role name is required" });

    // Normalize name
    const normalizedName = name.toLowerCase().trim();

    const existing = await prisma.roles.findUnique({
      where: { name: normalizedName }
    });
    
    if (existing) {
      return res.status(400).json({ error: "Role already exists" });
    }

    const newRole = await prisma.roles.create({
      data: {
        name: normalizedName,
        status: status || 'active'
      }
    });

    res.status(201).json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
};

// Update role (status, name)
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const role = await prisma.roles.findUnique({ where: { id: parseInt(id) } });
    if (!role) return res.status(404).json({ error: "Role not found" });

    const updateData = {};
    if (name) updateData.name = name.toLowerCase().trim();
    if (status) updateData.status = status;

    const updatedRole = await prisma.roles.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Role name already exists" });
    }
    res.status(500).json({ error: "Failed to update role" });
  }
};

// Delete a role (only if not in use)
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await prisma.roles.findUnique({ where: { id: parseInt(id) } });
    if (!role) return res.status(404).json({ error: "Role not found" });

    // Prevent deletion of core roles just in case
    if (['admin', 'teacher', 'student', 'parents'].includes(role.name)) {
      return res.status(403).json({ error: "Cannot delete core system roles. You can make them inactive instead." });
    }

    // Check if role is in use
    const usersWithRole = await prisma.users.count({
      where: { role: role.name }
    });

    if (usersWithRole > 0) {
      return res.status(400).json({ 
        error: `Role is currently assigned to ${usersWithRole} user(s). Cannot delete an in-use role. Update its status to inactive instead.` 
      });
    }

    await prisma.roles.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
};
