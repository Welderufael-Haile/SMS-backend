const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const bcrypt = require('bcryptjs');

const generateSecurePassword = () => {
  const length = 10;
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

const generateParentEmail = async (fullName) => {
  const nameParts = fullName.toLowerCase().trim().split(' ');
  const firstName = nameParts[0].replace(/[^a-z]/g, '');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
  
  let baseEmail = lastName ? `${firstName}.${lastName}` : firstName;
  let email = `${baseEmail}@parent.com`;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (!existing) break;
    email = `${baseEmail}${counter}@parent.com`;
    counter++;
  }
  return email;
};

class ParentService {
  static async getAllParents() {
    return await prisma.parents.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  static async getParentById(id) {
    const parentId = parseInt(id, 10);
    const parent = await prisma.parents.findUnique({
      where: { id: parentId }
    });

    if (!parent) {
      throw new NotFoundError('Parent not found');
    }

    return parent;
  }

  static async addParent(data) {
    const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = data;

    if (!First_Name || !Last_Name || !Sex) {
      throw new BadRequestError('First name, last name, and sex are required');
    }

    const orConditions = [
      ...(Email ? [{ Email }] : []),
      ...(Phone_Number ? [{ Phone_Number }] : [])
    ];

    if (orConditions.length > 0) {
      const existing = await prisma.parents.findFirst({
        where: {
          OR: orConditions
        }
      });

      if (existing) {
        const isEmailMatch = Email && existing.Email === Email;
        throw new BadRequestError(isEmailMatch ? 'Email already exists' : 'Phone number already exists');
      }
    }

    const finalEmail = Email ? Email.trim() : await generateParentEmail(`${First_Name} ${Last_Name}`);
    
    // Check if the email already exists in Users
    const existingUser = await prisma.users.findFirst({ where: { email: finalEmail } });
    if (existingUser) {
      throw new BadRequestError('Email is already associated with an existing user account');
    }

    const defaultPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          full_name: `${First_Name} ${Last_Name}`,
          email: finalEmail,
          password: hashedPassword,
          role: 'parent',
          status: 'active'
        }
      });

      const parent = await tx.parents.create({
        data: {
          First_Name,
          Last_Name,
          Sex,
          Phone_Number,
          Email: finalEmail,
          Address
        }
      });

      return {
        parent,
        credentials: { email: finalEmail, password: defaultPassword }
      };
    });
  }

  static async updateParent(id, data) {
    const parentId = parseInt(id, 10);
    const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = data;

    const orConditions = [
      ...(Email ? [{ Email }] : []),
      ...(Phone_Number ? [{ Phone_Number }] : [])
    ];

    if (orConditions.length > 0) {
      const duplicate = await prisma.parents.findFirst({
        where: {
          id: { not: parentId },
          OR: orConditions
        }
      });

      if (duplicate) {
        throw new BadRequestError('Email or Phone Number is already taken by another parent');
      }
    }

    try {
      return await prisma.parents.update({
        where: { id: parentId },
        data: {
          ...(First_Name && { First_Name }),
          ...(Last_Name && { Last_Name }),
          ...(Sex && { Sex }),
          Phone_Number,
          Email,
          Address
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Parent not found');
      }
      throw err;
    }
  }

  static async deleteParent(id) {
    const parentId = parseInt(id, 10);
    try {
      return await prisma.parents.delete({
        where: { id: parentId }
      });
    } catch (err) {
      if (err.code === 'P2003') {
        throw new BadRequestError('Cannot delete: This parent is still linked to a student.');
      }
      if (err.code === 'P2025') {
        throw new NotFoundError('Parent not found');
      }
      throw err;
    }
  }
}

module.exports = ParentService;
