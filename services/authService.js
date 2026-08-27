const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

class AuthService {
  static async register(data) {
    const { full_name, email, password, role, status } = data;

    if (!passwordRegex.test(password)) {
      throw new BadRequestError("Password must be at least 8 characters and include a letter, a number, and a special character.");
    }

    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new BadRequestError("Email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    return await prisma.users.create({
      data: {
        full_name,
        email,
        password: hashedPassword,
        role,
        status: status || 'active'
      }
    });
  }

  static async login(email, password) {
    const user = await prisma.users.findUnique({
      where: { email }
    });

    const genericError = "Invalid email or password.";
    if (!user) {
      throw new UnauthorizedError(genericError);
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`Your account is ${user.status}. Please contact support.`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError(genericError);
    }

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.full_name
      }
    };
  }

  static async getUsers(query) {
    const { page = 1, limit = 30 } = query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 30);
    const skip = (pageNum - 1) * limitNum;

    const total = await prisma.users.count();

    const data = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        status: true,
        last_login: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limitNum
    });

    return {
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    };
  }

  static async updateUser(id, data) {
    const userId = parseInt(id, 10);
    const { full_name, email, role, password, status } = data;

    const existing = await prisma.users.findFirst({
      where: {
        email,
        NOT: { id: userId }
      }
    });

    if (existing) {
      throw new BadRequestError("Email already in use.");
    }

    const updateData = {
      ...(full_name && { full_name }),
      ...(email && { email }),
      ...(role && { role }),
      ...(status && { status })
    };

    if (password && password.trim() !== "") {
      if (!passwordRegex.test(password)) {
        throw new BadRequestError("Weak new password.");
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    try {
      return await prisma.users.update({
        where: { id: userId },
        data: updateData
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("User not found");
      }
      throw err;
    }
  }

  static async updateMyProfile(id, data) {
    const userId = parseInt(id, 10);
    const { email, password, currentPassword } = data;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found.");

    const updateData = {};

    // Update Email
    if (email && email.trim() !== "" && email !== user.email) {
      const existing = await prisma.users.findFirst({
        where: { email, NOT: { id: userId } }
      });
      if (existing) throw new BadRequestError("Email already in use.");
      updateData.email = email;
    }

    // Update Password
    if (password && password.trim() !== "") {
      if (!currentPassword) {
        throw new BadRequestError("Current password is required to change your password.");
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new BadRequestError("Current password is incorrect.");
      }
      if (!passwordRegex.test(password)) {
        throw new BadRequestError("New password is too weak. Must be at least 8 characters, with letters and numbers.");
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return { message: "No changes made", user: { id: user.id, email: user.email, full_name: user.full_name } };
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, full_name: true, email: true, role: true }
    });

    return { message: "Profile updated successfully", user: updatedUser };
  }

  static async deleteUser(id, adminId) {
    const userId = parseInt(id, 10);

    if (userId === adminId) {
      throw new BadRequestError("You cannot delete your own admin account!");
    }

    try {
      return await prisma.users.delete({
        where: { id: userId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("User not found");
      }
      throw err;
    }
  }

  static async getActiveProfile(userId, expectedRole) {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId, 10) },
      select: { id: true, full_name: true, email: true, role: true, status: true }
    });

    if (!user || user.status !== 'active') {
      throw new ForbiddenError("Account is no longer active.");
    }

    if (expectedRole && user.role !== expectedRole) {
      throw new ForbiddenError("Unauthorized access.");
    }

    return user;
  }
}

module.exports = AuthService;
