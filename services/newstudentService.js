const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

const deleteFile = (filename) => {
  if (!filename) return;
  const fullPath = path.join(__dirname, "..", "uploads", filename);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error("File deletion error:", err);
    });
  }
};

class NewStudentService {
  static async registerStudent(data, files) {
    const { full_name, gender, email, phone_number, grade_level } = data;
    const profile_photo = files?.profile_photo ? files.profile_photo[0].filename : null;
    const grade_certificate = files?.grade_certificate ? files.grade_certificate[0].filename : null;

    return await prisma.students.create({
      data: {
        full_name,
        gender,
        email,
        phone_number,
        grade_level,
        profile_photo,
        grade_certificate
      }
    });
  }

  static async getStudents() {
    return await prisma.students.findMany({
      orderBy: { id: 'desc' }
    });
  }

  static async updateStudent(id, data, files) {
    const studentId = parseInt(id, 10);
    const existing = await prisma.students.findUnique({ where: { id: studentId } });

    if (!existing) {
      throw new NotFoundError("Student not found");
    }

    const { full_name, gender, email, phone_number, grade_level } = data;
    const newPhoto = files?.profile_photo?.[0]?.filename;
    const newCert = files?.grade_certificate?.[0]?.filename;

    if (newPhoto && existing.profile_photo) {
      deleteFile(existing.profile_photo);
    }
    if (newCert && existing.grade_certificate) {
      deleteFile(existing.grade_certificate);
    }

    return await prisma.students.update({
      where: { id: studentId },
      data: {
        ...(full_name && { full_name }),
        ...(gender && { gender }),
        ...(email && { email }),
        ...(phone_number && { phone_number }),
        ...(grade_level && { grade_level }),
        profile_photo: newPhoto || existing.profile_photo,
        grade_certificate: newCert || existing.grade_certificate
      }
    });
  }

  static async deleteStudent(id) {
    const studentId = parseInt(id, 10);
    const existing = await prisma.students.findUnique({ where: { id: studentId } });

    if (!existing) {
      throw new NotFoundError("Student not found");
    }

    if (existing.profile_photo) deleteFile(existing.profile_photo);
    if (existing.grade_certificate) deleteFile(existing.grade_certificate);

    return await prisma.students.delete({
      where: { id: studentId }
    });
  }
}

module.exports = NewStudentService;
