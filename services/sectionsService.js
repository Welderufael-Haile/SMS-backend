const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class SectionsService {
  static async fetchSections() {
    return await prisma.sections.findMany({
      orderBy: [
        { grade_level: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  static async fetchActiveSections() {
    return await prisma.sections.findMany({
      where: { status: 'active' },
      orderBy: [
        { grade_level: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  static async addSection(data) {
    const { name, grade_level, status } = data;
    const gradeNum = parseInt(grade_level, 10);

    const existingSection = await prisma.sections.findFirst({
      where: {
        name,
        grade_level: gradeNum
      }
    });

    if (existingSection) {
      throw new BadRequestError("Section already exists for this grade!");
    }

    return await prisma.sections.create({
      data: {
        name,
        grade_level: gradeNum,
        status: status || 'active'
      }
    });
  }

  static async updateSection(id, data) {
    const sectionId = parseInt(id, 10);
    const { name, grade_level, status } = data;

    try {
      return await prisma.sections.update({
        where: { id: sectionId },
        data: {
          ...(name && { name }),
          ...(grade_level !== undefined && { grade_level: parseInt(grade_level, 10) }),
          ...(status && { status })
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Section not found");
      }
      throw err;
    }
  }

  static async toggleStatus(id, status) {
    const sectionId = parseInt(id, 10);
    try {
      return await prisma.sections.update({
        where: { id: sectionId },
        data: { status }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Section not found");
      }
      throw err;
    }
  }

  static async deleteSection(id) {
    const sectionId = parseInt(id, 10);
    try {
      return await prisma.sections.delete({
        where: { id: sectionId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Section not found");
      }
      throw err;
    }
  }
}

module.exports = SectionsService;
