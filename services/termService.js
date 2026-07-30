const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class TermService {
  static async getAllTerms() {
    return await prisma.terms.findMany({
      orderBy: { start_date: 'desc' },
      include: { academic_year: true }
    });
  }

  static async getTermsByAcademicYear(academicYearId) {
    return await prisma.terms.findMany({
      where: { academic_year_id: parseInt(academicYearId, 10) },
      orderBy: { start_date: 'asc' }
    });
  }

  static async getTermById(id) {
    const term = await prisma.terms.findUnique({
      where: { id: parseInt(id, 10) },
      include: { academic_year: true }
    });
    if (!term) {
      throw new NotFoundError('Term not found');
    }
    return term;
  }

  static async createTerm(data) {
    const academic_year_id = parseInt(data.academic_year_id, 10);
    const { term_name, start_date, end_date } = data;

    const existing = await prisma.terms.findFirst({
      where: {
        academic_year_id,
        term_name
      }
    });

    if (existing) {
      throw new BadRequestError('This term name already exists for the selected academic year.');
    }

    return await prisma.terms.create({
      data: {
        academic_year_id,
        term_name,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      }
    });
  }

  static async updateTerm(id, data) {
    const termId = parseInt(id, 10);
    const { term_name, start_date, end_date } = data;

    try {
      return await prisma.terms.update({
        where: { id: termId },
        data: {
          ...(term_name && { term_name }),
          ...(start_date && { start_date: new Date(start_date) }),
          ...(end_date && { end_date: new Date(end_date) })
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Term not found');
      }
      throw err;
    }
  }

  static async deleteTerm(id) {
    const termId = parseInt(id, 10);
    try {
      return await prisma.terms.delete({
        where: { id: termId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Term not found');
      }
      throw err;
    }
  }
}

module.exports = TermService;
