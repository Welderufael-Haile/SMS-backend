const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class AcademicYearService {
  static async getAllAcademicYears() {
    return await prisma.academic_year.findMany({
      orderBy: { start_date: 'desc' }
    });
  }

  static async getAcademicYearById(id) {
    const academicYear = await prisma.academic_year.findUnique({
      where: { id: parseInt(id, 10) }
    });
    if (!academicYear) {
      throw new NotFoundError('Academic year not found');
    }
    return academicYear;
  }

  static async createAcademicYear(data) {
    const { year_name, start_date, end_date } = data;
    return await prisma.academic_year.create({
      data: {
        year_name,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      }
    });
  }

  static async updateAcademicYear(id, data) {
    const yearId = parseInt(id, 10);
    const { year_name, start_date, end_date } = data;

    try {
      return await prisma.academic_year.update({
        where: { id: yearId },
        data: {
          ...(year_name && { year_name }),
          ...(start_date && { start_date: new Date(start_date) }),
          ...(end_date && { end_date: new Date(end_date) })
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Academic year not found');
      }
      throw err;
    }
  }

  static async deleteAcademicYear(id) {
    const yearId = parseInt(id, 10);

    const associatedTerms = await prisma.terms.findFirst({
      where: { academic_year_id: yearId }
    });

    if (associatedTerms) {
      throw new BadRequestError('Cannot delete academic year with associated terms. Delete the terms first.');
    }

    try {
      return await prisma.academic_year.delete({
        where: { id: yearId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Academic year not found');
      }
      throw err;
    }
  }
}

module.exports = AcademicYearService;
