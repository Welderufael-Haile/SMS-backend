const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

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

const generateEmail = async (fullName) => {
  const nameParts = fullName.toLowerCase().trim().split(' ');
  const firstName = nameParts[0].replace(/[^a-z]/g, '');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
  
  let baseEmail = lastName ? `${firstName}.${lastName}` : firstName;
  let email = `${baseEmail}@student.com`;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (!existing) break;
    email = `${baseEmail}${counter}@student.com`;
    counter++;
  }
  return email;
};

const deleteFile = (filename) => {
  if (!filename) return;
  const fullPath = path.join(__dirname, "..", "uploads", filename);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error("File deletion error:", err);
    });
  }
};

class AddStudentService {
  static async addStudent(data, file) {
    const { full_name, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id } = data;
    const profile_photo = file ? file.filename : null;

    const year = new Date(Date_of_birth).getFullYear();
    if (year > 2100) {
      if (file) deleteFile(file.filename);
      throw new BadRequestError("Invalid Year: Please use a 4-digit year (e.g. 2024)");
    }

    const email = await generateEmail(full_name);
    const defaultPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          full_name,
          email,
          password: hashedPassword,
          role: 'student',
          status: 'active'
        }
      });

      const student = await tx.student.create({
        data: {
          full_name,
          profile_photo,
          Sex,
          Date_of_birth: new Date(Date_of_birth),
          parents_id: parents_id ? parseInt(parents_id, 10) : null,
          sections_id: parseInt(sections_id, 10),
          terms_id: terms_id ? parseInt(terms_id, 10) : null,
          academic_year_id: academic_year_id ? parseInt(academic_year_id, 10) : null,
          user_id: user.id
        }
      });

      return {
        student,
        credentials: { email, password: defaultPassword }
      };
    });
  }

  static async getAllStudents() {
    const students = await prisma.student.findMany({
      include: {
        parents: true,
        sections: true,
        terms: true,
        academic_year: true,
        Users: true
      },
      orderBy: { id: 'desc' }
    });

    return students.map(s => ({
      ...s,
      First_Name: s.parents?.First_Name,
      Last_Name: s.parents?.Last_Name,
      Phone_Number: s.parents?.Phone_Number,
      section_name: s.sections?.name,
      grade_level: s.sections?.grade_level,
      term_name: s.terms?.term_name,
      year_name: s.academic_year?.year_name,
      email: s.Users?.email,
      user_status: s.Users?.status
    }));
  }

  static async updateStudent(id, data, file) {
    const studentId = parseInt(id, 10);
    const { full_name, Sex, Date_of_birth, parents_id, sections_id, terms_id, academic_year_id } = data;
    const newPhoto = file ? file.filename : null;

    if (!full_name || !Sex || !Date_of_birth || !sections_id) {
      if (newPhoto) deleteFile(newPhoto);
      throw new BadRequestError("Required fields are missing");
    }

    const existing = await prisma.student.findUnique({ where: { id: studentId } });
    if (!existing) {
      if (newPhoto) deleteFile(newPhoto);
      throw new NotFoundError("Student not found");
    }

    const oldPhoto = existing.profile_photo;
    const finalPhoto = newPhoto || oldPhoto;

    return await prisma.$transaction(async (tx) => {
      if (existing.user_id) {
        await tx.users.update({
          where: { id: existing.user_id },
          data: { full_name }
        });
      }

      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          full_name,
          profile_photo: finalPhoto,
          Sex,
          Date_of_birth: new Date(Date_of_birth),
          parents_id: parents_id ? parseInt(parents_id, 10) : null,
          sections_id: parseInt(sections_id, 10),
          terms_id: terms_id ? parseInt(terms_id, 10) : null,
          academic_year_id: academic_year_id ? parseInt(academic_year_id, 10) : null
        }
      });

      if (newPhoto && oldPhoto) {
        deleteFile(oldPhoto);
      }

      return updatedStudent;
    });
  }

  static async deleteStudent(id) {
    const studentId = parseInt(id, 10);
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    return await prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id: studentId } });
      if (student.user_id) {
        await tx.users.delete({ where: { id: student.user_id } });
      }
      if (student.profile_photo) {
        deleteFile(student.profile_photo);
      }
    });
  }
}

module.exports = AddStudentService;
