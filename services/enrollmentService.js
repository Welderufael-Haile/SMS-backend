const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class EnrollmentService {
  static async getAllEnrollments(query) {
    const { year, term, section, student, page = 1, limit = 30 } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      status: 'active',
      ...(year ? { academic_year_id: parseInt(year, 10) } : {}),
      ...(term ? { terms_id: parseInt(term, 10) } : {}),
      ...(section ? { sections_id: parseInt(section, 10) } : {}),
      ...(student ? { Student: { full_name: { contains: student } } } : {})
    };

    const total = await prisma.enrollments.count({ where });

    const records = await prisma.enrollments.findMany({
      where,
      include: {
        Student: true,
        academic_year: true,
        terms: true,
        sections: true
      },
      orderBy: [
        { academic_year: { year_name: 'desc' } },
        { terms: { term_name: 'desc' } }
      ],
      skip,
      take: limitNum
    });

    const data = records.map(e => ({
      ...e,
      full_name: e.Student?.full_name,
      Sex: e.Student?.Sex,
      year_name: e.academic_year?.year_name,
      term_name: e.terms?.term_name,
      start_date: e.terms?.start_date,
      section_name: e.sections?.name,
      grade_level: e.sections?.grade_level
    }));

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

  static async getDropdowns() {
    const students = await prisma.student.findMany({
      select: { id: true, full_name: true },
      orderBy: { full_name: 'asc' }
    });

    const academic_years = await prisma.academic_year.findMany({
      select: { id: true, year_name: true },
      orderBy: { year_name: 'desc' }
    });

    const terms = await prisma.terms.findMany({
      select: { id: true, term_name: true, start_date: true, academic_year_id: true },
      orderBy: { start_date: 'asc' }
    });

    const sections = await prisma.sections.findMany({
      select: { id: true, name: true, grade_level: true },
      orderBy: [{ grade_level: 'asc' }, { name: 'asc' }]
    });

    return { students, academic_years, terms, sections };
  }

  static async createEnrollment(data) {
    const { student_id, academic_year_id, terms_id, sections_id } = data;
    const studentId = parseInt(student_id, 10);
    const yearId = parseInt(academic_year_id, 10);
    const termId = parseInt(terms_id, 10);
    const sectionId = parseInt(sections_id, 10);

    if (isNaN(studentId) || isNaN(yearId) || isNaN(termId) || isNaN(sectionId)) {
      throw new BadRequestError("Missing required fields for enrollment: student, academic year, term, and section are all required.");
    }

    const existing = await prisma.enrollments.findFirst({
      where: {
        student_id: studentId,
        academic_year_id: yearId,
        terms_id: termId
      }
    });

    if (existing) {
      throw new BadRequestError("Student already enrolled in this term.");
    }

    return await prisma.enrollments.create({
      data: {
        student_id: studentId,
        academic_year_id: yearId,
        terms_id: termId,
        sections_id: sectionId,
        status: 'active'
      }
    });
  }

  static async updateEnrollment(id, data) {
    const enrollmentId = parseInt(id, 10);
    const { student_id, academic_year_id, terms_id, sections_id } = data;

    const parsedStudentId = parseInt(student_id, 10);
    const parsedYearId = parseInt(academic_year_id, 10);
    const parsedTermId = parseInt(terms_id, 10);
    const parsedSectionId = parseInt(sections_id, 10);

    if (isNaN(parsedStudentId) || isNaN(parsedYearId) || isNaN(parsedTermId) || isNaN(parsedSectionId)) {
      throw new BadRequestError("Missing required fields for update: student, academic year, term, and section are all required.");
    }

    try {
      return await prisma.enrollments.update({
        where: { id: enrollmentId },
        data: {
          student_id: parsedStudentId,
          academic_year_id: parsedYearId,
          terms_id: parsedTermId,
          sections_id: parsedSectionId
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Enrollment not found");
      }
      throw err;
    }
  }

  static async deleteEnrollment(id) {
    const enrollmentId = parseInt(id, 10);
    try {
      return await prisma.enrollments.delete({
        where: { id: enrollmentId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Enrollment not found");
      }
      throw err;
    }
  }

  static async bulkTransfer(enrollmentIds, targetSectionId) {
    if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      throw new BadRequestError("No enrollments selected.");
    }
    const sectionId = parseInt(targetSectionId, 10);
    if (!sectionId) throw new BadRequestError("Target section is required.");

    // Validate target section
    const targetSection = await prisma.sections.findUnique({ where: { id: sectionId } });
    if (!targetSection) throw new NotFoundError("Target section not found.");

    // Validate selected enrollments
    const enrollments = await prisma.enrollments.findMany({
      where: { id: { in: enrollmentIds } },
      include: { sections: true }
    });

    if (enrollments.length !== enrollmentIds.length) {
      throw new BadRequestError("Some enrollments were not found.");
    }

    for (const e of enrollments) {
      if (!e.sections) continue; // If an enrollment doesn't have a section, we can allow transferring them to one
      if (e.sections.grade_level !== targetSection.grade_level) {
        throw new BadRequestError(`Cannot transfer a student from grade ${e.sections.grade_level} to grade ${targetSection.grade_level}. Bulk transfers must remain in the same grade level.`);
      }
    }

    return await prisma.enrollments.updateMany({
      where: { id: { in: enrollmentIds } },
      data: { sections_id: sectionId }
    });
  }

  static async updateEnrollmentStatus(id, status) {
    const enrollmentId = parseInt(id, 10);
    const validStatuses = ['active', 'completed', 'promoted', 'repeated'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status value. Valid: ${validStatuses.join(', ')}`);
    }

    const completedAt = status === 'active' ? null : new Date();

    try {
      return await prisma.enrollments.update({
        where: { id: enrollmentId },
        data: {
          status,
          completed_at: completedAt
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Enrollment not found");
      }
      throw err;
    }
  }

  static async enrollNextTerm(data) {
    const { academic_year_id, current_term_id, next_term_id, next_academic_year_id } = data;
    const yearId = parseInt(academic_year_id, 10);
    const curTermId = parseInt(current_term_id, 10);
    const nextTermId = parseInt(next_term_id, 10);
    const nextYearId = parseInt(next_academic_year_id, 10);

    return await prisma.$transaction(async (tx) => {
      await tx.enrollments.updateMany({
        where: {
          academic_year_id: yearId,
          terms_id: curTermId,
          status: 'active'
        },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });

      const completed = await tx.enrollments.findMany({
        where: {
          academic_year_id: yearId,
          terms_id: curTermId,
          status: 'completed'
        }
      });

      if (completed.length === 0) return { enrolled: 0 };

      const studentIds = completed.map(c => c.student_id);
      
      const existingInNextTerm = await tx.enrollments.findMany({
        where: {
          academic_year_id: nextYearId,
          terms_id: nextTermId,
          student_id: { in: studentIds }
        },
        select: { student_id: true }
      });
      
      const existingStudentIds = new Set(existingInNextTerm.map(e => e.student_id));

      const toCreate = completed
        .filter(item => !existingStudentIds.has(item.student_id))
        .map(item => ({
          student_id: item.student_id,
          academic_year_id: nextYearId,
          terms_id: nextTermId,
          sections_id: item.sections_id,
          status: 'active'
        }));

      if (toCreate.length > 0) {
        await tx.enrollments.createMany({
          data: toCreate
        });
      }

      return { enrolled: toCreate.length };
    }, {
      timeout: 30000
    });
  }

  static async getArchivedEnrollments(query) {
    const { year, term, section, student, status, page = 1, limit = 30 } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const statusFilter = status ? [status] : ['completed', 'promoted', 'repeated'];

    const where = {
      status: { in: statusFilter },
      ...(year ? { academic_year_id: parseInt(year, 10) } : {}),
      ...(term ? { terms_id: parseInt(term, 10) } : {}),
      ...(section ? { sections_id: parseInt(section, 10) } : {}),
      ...(student ? { Student: { full_name: { contains: student } } } : {})
    };

    const total = await prisma.enrollments.count({ where });

    const records = await prisma.enrollments.findMany({
      where,
      include: {
        Student: true,
        academic_year: true,
        terms: true,
        sections: true
      },
      orderBy: { completed_at: 'desc' },
      skip,
      take: limitNum
    });

    const data = records.map(e => ({
      ...e,
      full_name: e.Student?.full_name,
      Sex: e.Student?.Sex,
      year_name: e.academic_year?.year_name,
      term_name: e.terms?.term_name,
      section_name: e.sections?.name,
      grade_level: e.sections?.grade_level
    }));

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

  static async restoreEnrollment(id) {
    const enrollmentId = parseInt(id, 10);
    try {
      return await prisma.enrollments.update({
        where: { id: enrollmentId },
        data: {
          status: 'active',
          completed_at: null
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Enrollment not found");
      }
      throw err;
    }
  }

  static async permanentDelete(id) {
    const enrollmentId = parseInt(id, 10);
    const existing = await prisma.enrollments.findFirst({
      where: {
        id: enrollmentId,
        NOT: { status: 'active' }
      }
    });

    if (!existing) {
      throw new BadRequestError("Cannot delete active enrollment or record not found.");
    }

    return await prisma.enrollments.delete({
      where: { id: enrollmentId }
    });
  }

  static async getArchiveCount() {
    const count = await prisma.enrollments.count({
      where: {
        status: { in: ['completed', 'promoted', 'repeated'] }
      }
    });
    return { count };
  }
}

module.exports = EnrollmentService;
