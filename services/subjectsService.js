const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class SubjectsService {
  static async fetchSubjects() {
    return await prisma.subjects.findMany({
      orderBy: [
        { grade_level: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  static async addSubject(data) {
    const { name, grade_level } = data;
    const gradeNum = parseInt(grade_level, 10);

    const existing = await prisma.subjects.findFirst({
      where: {
        name,
        grade_level: gradeNum
      }
    });

    if (existing) {
      throw new BadRequestError("Subject with this name and grade level already exists");
    }

    return await prisma.subjects.create({
      data: {
        name,
        grade_level: gradeNum
      }
    });
  }

  static async updateSubject(id, data) {
    const subjectId = parseInt(id, 10);
    const { name, grade_level } = data;
    const gradeNum = parseInt(grade_level, 10);

    const existing = await prisma.subjects.findFirst({
      where: {
        name,
        grade_level: gradeNum,
        NOT: { id: subjectId }
      }
    });

    if (existing) {
      throw new BadRequestError("Another subject with this name and grade level already exists");
    }

    try {
      return await prisma.subjects.update({
        where: { id: subjectId },
        data: {
          name,
          grade_level: gradeNum
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Subject not found");
      }
      throw err;
    }
  }

  static async deleteSubject(id) {
    const subjectId = parseInt(id, 10);
    try {
      return await prisma.subjects.delete({
        where: { id: subjectId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Subject not found");
      }
      throw err;
    }
  }
}

module.exports = SubjectsService;
