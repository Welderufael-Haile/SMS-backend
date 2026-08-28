const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const toNum = (val) => {
  const n = Number(val);
  return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
};

class TeacherSectionSubjectService {
  static async addAssignment(data) {
    const teacher_id = toNum(data.teacher_id);
    const section_id = toNum(data.section_id);
    const subject_id = toNum(data.subject_id);
    const academic_year_id = toNum(data.academic_year_id);
    const periods_per_week = toNum(data.periods_per_week) || 3;
    const is_home_teacher = data.is_home_teacher === true;

    if (!teacher_id || !section_id || !subject_id || !academic_year_id) {
      throw new BadRequestError("teacher_id, section_id, subject_id and academic_year_id are required");
    }

    // Validate referenced records
    const [teacher, section, subject, year] = await Promise.all([
      prisma.teachers.findUnique({ where: { id: teacher_id } }),
      prisma.sections.findUnique({ where: { id: section_id } }),
      prisma.subjects.findUnique({ where: { id: subject_id } }),
      prisma.academic_year.findUnique({ where: { id: academic_year_id } })
    ]);

    if (!teacher) throw new BadRequestError(`Teacher id ${teacher_id} not found`);
    if (!section) throw new BadRequestError(`Section id ${section_id} not found`);
    if (!subject) throw new BadRequestError(`Subject id ${subject_id} not found`);
    if (!year) throw new BadRequestError(`Academic year id ${academic_year_id} not found`);

    // Check for existing active assignment
    const exists = await prisma.teacher_section_subjects.findFirst({
      where: { section_id, subject_id, academic_year_id, is_active: true }
    });

    if (exists) {
      throw new BadRequestError("This section and subject combination already has an active teacher assigned.");
    }

    // Deactivate any existing assignments
    await prisma.teacher_section_subjects.updateMany({
      where: { section_id, subject_id, academic_year_id },
      data: { is_active: false }
    });

    return await prisma.teacher_section_subjects.create({
      data: { teacher_id, section_id, subject_id, academic_year_id, periods_per_week, is_home_teacher }
    });
  }

  static async getAssignments() {
    const assignments = await prisma.teacher_section_subjects.findMany({
      include: {
        teachers: true,
        sections: true,
        subjects: true,
        academic_year: true
      },
      orderBy: [{ academic_year: { year_name: 'asc' } }, { teachers: { full_name: 'asc' } }]
    });

    return assignments.map(a => ({
      id: a.id,
      teacher_id: a.teacher_id,
      teacher: a.teachers?.full_name,
      section_id: a.section_id,
      section: `${a.sections?.grade_level || ''}${a.sections?.name || ''}`,
      subject_id: a.subject_id,
      subject: a.subjects?.name,
      academic_year_id: a.academic_year_id,
      academic_year: a.academic_year?.year_name,
      periods_per_week: a.periods_per_week,
      is_active: a.is_active,
      is_home_teacher: a.is_home_teacher
    }));
  }

  static async getAssignment(id) {
    const assignmentId = toNum(id);
    if (!assignmentId) throw new BadRequestError("Invalid id");

    const a = await prisma.teacher_section_subjects.findUnique({
      where: { id: assignmentId },
      include: { teachers: true, sections: true, subjects: true, academic_year: true }
    });

    if (!a) throw new NotFoundError("Assignment not found");

    return {
      id: a.id,
      teacher_id: a.teacher_id,
      teacher: a.teachers?.full_name,
      section_id: a.section_id,
      section: `${a.sections?.grade_level || ''}${a.sections?.name || ''}`,
      subject_id: a.subject_id,
      subject: a.subjects?.name,
      academic_year_id: a.academic_year_id,
      academic_year: a.academic_year?.year_name,
      periods_per_week: a.periods_per_week,
      is_active: a.is_active,
      is_home_teacher: a.is_home_teacher
    };
  }

  static async updateAssignment(id, data) {
    const assignmentId = toNum(id);
    const teacher_id = toNum(data.teacher_id);
    const section_id = toNum(data.section_id);
    const subject_id = toNum(data.subject_id);
    const academic_year_id = toNum(data.academic_year_id);
    const periods_per_week = toNum(data.periods_per_week) || 3;
    const is_home_teacher = data.is_home_teacher === true;

    if (!assignmentId || !teacher_id || !section_id || !subject_id || !academic_year_id) {
      throw new BadRequestError("All fields are required");
    }

    const conflict = await prisma.teacher_section_subjects.findFirst({
      where: {
        section_id, subject_id, academic_year_id,
        id: { not: assignmentId },
        is_active: true
      }
    });

    if (conflict) {
      throw new BadRequestError("This section and subject combination already has an active teacher assigned.");
    }

    // Deactivate conflicts
    await prisma.teacher_section_subjects.updateMany({
      where: { section_id, subject_id, academic_year_id, id: { not: assignmentId } },
      data: { is_active: false }
    });

    try {
      return await prisma.teacher_section_subjects.update({
        where: { id: assignmentId },
        data: { teacher_id, section_id, subject_id, academic_year_id, periods_per_week, is_home_teacher, is_active: true }
      });
    } catch (err) {
      if (err.code === 'P2025') throw new NotFoundError("Assignment not found");
      throw err;
    }
  }

  static async toggleAssignmentStatus(id) {
    const assignmentId = toNum(id);
    if (!assignmentId) throw new BadRequestError("Invalid id");

    const current = await prisma.teacher_section_subjects.findUnique({
      where: { id: assignmentId }
    });

    if (!current) throw new NotFoundError("Assignment not found");

    return await prisma.teacher_section_subjects.update({
      where: { id: assignmentId },
      data: { is_active: !current.is_active }
    });
  }
}

module.exports = TeacherSectionSubjectService;
