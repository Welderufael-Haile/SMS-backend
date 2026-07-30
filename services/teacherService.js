const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const validateTeacherInput = (data) => {
  const errors = [];
  
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push("Full name must be at least 2 characters");
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }
  
  if (!data.phone_number || !/^[0-9]{10,15}$/.test(data.phone_number)) {
    errors.push("Phone number must be 10-15 digits");
  }
  
  if (!data.Subject || data.Subject.trim().length < 2) {
    errors.push("Subject is required");
  }
  
  if (!data.address || data.address.trim().length < 5) {
    errors.push("Address is required");
  }
  
  return errors;
};

const deleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(__dirname, "..", "uploads", filename);
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
  }
};

class TeacherService {
  static async createTeacher(data, files) {
    const { user_id, full_name, email, gender, phone_number, Subject, address } = data;
    const userIdNum = parseInt(user_id, 10);

    if (!user_id) {
      throw new BadRequestError("User ID is required");
    }

    const userCheck = await prisma.users.findFirst({
      where: { id: userIdNum, role: 'teacher' }
    });

    if (!userCheck) {
      throw new BadRequestError("Invalid user ID or user is not a teacher");
    }

    const validationErrors = validateTeacherInput(data);
    if (validationErrors.length > 0) {
      throw new BadRequestError(validationErrors.join(", "));
    }

    const emailCheck = await prisma.teachers.findFirst({
      where: { email: email.trim() }
    });
    if (emailCheck) {
      throw new BadRequestError("Email already exists");
    }

    const userIdCheck = await prisma.teachers.findFirst({
      where: { user_id: userIdNum }
    });
    if (userIdCheck) {
      throw new BadRequestError("User ID already assigned to another teacher");
    }

    const profile_photo = files?.profile_photo?.[0]?.filename || null;
    const degree_certificate = files?.degree_certificate?.[0]?.filename || null;

    return await prisma.teachers.create({
      data: {
        user_id: userIdNum,
        full_name: full_name.trim(),
        email: email.trim(),
        gender,
        phone_number: phone_number.trim(),
        Subject: Subject.trim(),
        address: address.trim(),
        profile_photo,
        degree_certificate
      }
    });
  }

  static async getAllTeachers() {
    const teachers = await prisma.teachers.findMany({
      include: {
        Users: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { id: 'desc' }
    });

    return teachers.map(t => ({
      ...t,
      user_full_name: t.Users?.full_name,
      user_email: t.Users?.email
    }));
  }

  static async getTeacherById(id) {
    const teacherId = parseInt(id, 10);
    const teacher = await prisma.teachers.findUnique({
      where: { id: teacherId },
      include: {
        Users: {
          select: { full_name: true, email: true }
        }
      }
    });

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    return {
      ...teacher,
      user_full_name: teacher.Users?.full_name,
      user_email: teacher.Users?.email
    };
  }

  static async getTeachersUsers() {
    const assignedUserIds = await prisma.teachers.findMany({
      where: { user_id: { not: null } },
      select: { user_id: true }
    });

    const ids = assignedUserIds.map(t => t.user_id);

    return await prisma.users.findMany({
      where: {
        role: 'teacher',
        id: { notIn: ids }
      },
      select: { id: true, full_name: true, email: true },
      orderBy: { full_name: 'asc' }
    });
  }

  static async updateTeacher(id, data, files) {
    const teacherId = parseInt(id, 10);
    const { user_id, full_name, email, gender, phone_number, Subject, address } = data;
    const userIdNum = parseInt(user_id, 10);

    if (!user_id) {
      throw new BadRequestError("User ID is required");
    }

    const validationErrors = validateTeacherInput(data);
    if (validationErrors.length > 0) {
      throw new BadRequestError(validationErrors.join(", "));
    }

    const teacher = await prisma.teachers.findUnique({
      where: { id: teacherId }
    });

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    const userCheck = await prisma.users.findFirst({
      where: { id: userIdNum, role: 'teacher' }
    });

    if (!userCheck) {
      throw new BadRequestError("Invalid user ID or user is not a teacher");
    }

    const emailCheck = await prisma.teachers.findFirst({
      where: {
        email: email.trim(),
        NOT: { id: teacherId }
      }
    });
    if (emailCheck) {
      throw new BadRequestError("Email already exists");
    }

    const userIdCheck = await prisma.teachers.findFirst({
      where: {
        user_id: userIdNum,
        NOT: { id: teacherId }
      }
    });
    if (userIdCheck) {
      throw new BadRequestError("User ID already assigned to another teacher");
    }

    const newProfilePhoto = files?.profile_photo?.[0]?.filename;
    const newDegreeCert = files?.degree_certificate?.[0]?.filename;

    if (newProfilePhoto && teacher.profile_photo) {
      deleteFile(teacher.profile_photo);
    }

    if (newDegreeCert && teacher.degree_certificate) {
      deleteFile(teacher.degree_certificate);
    }

    const updatedPhoto = newProfilePhoto || teacher.profile_photo;
    const updatedDegree = newDegreeCert || teacher.degree_certificate;

    return await prisma.teachers.update({
      where: { id: teacherId },
      data: {
        user_id: userIdNum,
        full_name: full_name.trim(),
        email: email.trim(),
        gender,
        phone_number: phone_number.trim(),
        Subject: Subject.trim(),
        address: address.trim(),
        profile_photo: updatedPhoto,
        degree_certificate: updatedDegree
      }
    });
  }

  static async deleteTeacher(id) {
    const teacherId = parseInt(id, 10);
    const teacher = await prisma.teachers.findUnique({
      where: { id: teacherId }
    });

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    if (teacher.profile_photo) deleteFile(teacher.profile_photo);
    if (teacher.degree_certificate) deleteFile(teacher.degree_certificate);

    return await prisma.teachers.delete({
      where: { id: teacherId }
    });
  }
}

module.exports = TeacherService;
