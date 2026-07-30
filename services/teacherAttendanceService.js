const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

const getTeacherByUserId = async (userId) => {
  const teacher = await prisma.teachers.findFirst({
    where: { user_id: parseInt(userId, 10) }
  });
  if (!teacher) throw new NotFoundError("Teacher not found");
  return teacher;
};

class TeacherAttendanceService {
  static async getStudentsForAttendance(userId, query) {
    const { section_id, term_id, date } = query;
    const teacher = await getTeacherByUserId(userId);
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: {
        teacher_id: teacher.id,
        is_active: true,
        ...(section_id ? { section_id: parseInt(section_id, 10) } : {})
      }
    });

    const sectionIds = [...new Set(assignments.map(a => a.section_id))];
    const yearIds = [...new Set(assignments.map(a => a.academic_year_id))];

    const enrollments = await prisma.enrollments.findMany({
      where: {
        sections_id: { in: sectionIds },
        academic_year_id: { in: yearIds },
        status: 'active',
        ...(term_id ? { terms_id: parseInt(term_id, 10) } : {})
      },
      include: {
        Student: true,
        sections: true,
        academic_year: true,
        terms: true,
        attendance: {
          where: { date: new Date(attendanceDate) }
        }
      },
      orderBy: { Student: { full_name: 'asc' } }
    });

    return {
      date: attendanceDate,
      students: enrollments.map(e => ({
        enrollment_id: e.id,
        student_id: e.student_id,
        full_name: e.Student?.full_name,
        gender: e.Student?.Sex,
        section: `${e.sections?.grade_level}${e.sections?.name}`,
        year_name: e.academic_year?.year_name,
        term_name: e.terms?.term_name,
        term_id: e.terms_id,
        section_id: e.sections_id,
        attendance_status: e.attendance[0]?.status || 'unmarked',
        attendance_id: e.attendance[0]?.id || null
      }))
    };
  }

  static async markAttendance(userId, date, attendance) {
    if (!date || !attendance || !Array.isArray(attendance)) {
      throw new BadRequestError("Invalid request format");
    }

    const teacher = await getTeacherByUserId(userId);
    const attendanceDate = new Date(date);

    const results = { total: attendance.length, success: 0, failed: 0, errors: [] };

    for (const item of attendance) {
      try {
        const { enrollment_id, status, remarks } = item;
        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }

        const enrollment = await prisma.enrollments.findUnique({ where: { id: parseInt(enrollment_id, 10) } });
        if (!enrollment || enrollment.status !== 'active') {
          throw new Error("Cannot mark attendance for inactive enrollment");
        }

        const existing = await prisma.attendance.findFirst({
          where: { enrollment_id: parseInt(enrollment_id, 10), date: attendanceDate }
        });

        if (existing) {
          await prisma.attendance.update({
            where: { id: existing.id },
            data: { status, remarks: remarks || null, marked_by: teacher.id }
          });
        } else {
          await prisma.attendance.create({
            data: {
              enrollment_id: parseInt(enrollment_id, 10),
              date: attendanceDate,
              status,
              remarks: remarks || null,
              marked_by: teacher.id
            }
          });
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ enrollment_id: item.enrollment_id, error: err.message });
      }
    }

    return results;
  }

  static async getTeacherSections(userId, academic_year_id) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: {
        teacher_id: teacher.id,
        is_active: true,
        ...(academic_year_id ? { academic_year_id: parseInt(academic_year_id, 10) } : {})
      },
      include: { sections: true, academic_year: true },
      distinct: ['section_id']
    });

    return assignments.map(a => ({
      id: a.sections?.id,
      name: a.sections?.name,
      grade_level: a.sections?.grade_level,
      display_name: `${a.sections?.grade_level}${a.sections?.name}`,
      academic_year_id: a.academic_year_id,
      year_name: a.academic_year?.year_name
    }));
  }

  static async getTeacherTerms(userId) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true },
      include: {
        academic_year: {
          include: { terms: true }
        }
      },
      distinct: ['academic_year_id']
    });

    const terms = [];
    assignments.forEach(a => {
      a.academic_year?.terms?.forEach(t => {
        terms.push({
          id: t.id,
          term_name: t.term_name,
          year_name: a.academic_year?.year_name,
          academic_year_id: a.academic_year_id,
          display_name: `${t.term_name} (${a.academic_year?.year_name})`
        });
      });
    });

    return terms;
  }

  static async getStudentAttendanceHistory(userId, studentId, termId) {
    const teacher = await getTeacherByUserId(userId);
    const sId = parseInt(studentId, 10);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true }
    });

    const sectionIds = assignments.map(a => a.section_id);
    const access = await prisma.enrollments.findFirst({
      where: {
        student_id: sId,
        sections_id: { in: sectionIds }
      }
    });

    if (!access) throw new ForbiddenError("Unauthorized: You don't have access to this student");

    const history = await prisma.attendance.findMany({
      where: {
        enrollments: {
          student_id: sId,
          ...(termId ? { terms_id: parseInt(termId, 10) } : {})
        }
      },
      include: {
        enrollments: { include: { terms: true, academic_year: true } }
      },
      orderBy: { date: 'desc' }
    });

    const total = history.length;
    const present = history.filter(a => a.status === 'present').length;
    const absent = history.filter(a => a.status === 'absent').length;
    const late = history.filter(a => a.status === 'late').length;
    const excused = history.filter(a => a.status === 'excused').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    return {
      history: history.map(a => ({
        ...a,
        formatted_date: a.date?.toISOString().split('T')[0],
        day_name: a.date ? new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' }) : null,
        term_name: a.enrollments?.terms?.term_name,
        year_name: a.enrollments?.academic_year?.year_name
      })),
      statistics: { total_days: total, present, absent, late, excused, percentage }
    };
  }

  static async getTodaySummary(userId) {
    const teacher = await getTeacherByUserId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true },
      include: { sections: true }
    });

    const sectionIds = [...new Set(assignments.map(a => a.section_id))];
    const yearIds = [...new Set(assignments.map(a => a.academic_year_id))];

    const enrollments = await prisma.enrollments.findMany({
      where: {
        sections_id: { in: sectionIds },
        academic_year_id: { in: yearIds },
        status: 'active'
      },
      include: {
        sections: true,
        attendance: { where: { date: today } }
      }
    });

    const summaryMap = {};
    enrollments.forEach(e => {
      const key = `${e.sections?.grade_level}${e.sections?.name}`;
      if (!summaryMap[key]) {
        summaryMap[key] = { section: key, total_students: 0, present: 0, absent: 0, late: 0, excused: 0, not_marked: 0 };
      }
      summaryMap[key].total_students++;
      const att = e.attendance[0];
      if (att) {
        summaryMap[key][att.status] = (summaryMap[key][att.status] || 0) + 1;
      } else {
        summaryMap[key].not_marked++;
      }
    });

    return {
      date: today.toISOString().split('T')[0],
      sections: Object.values(summaryMap)
    };
  }
}

module.exports = TeacherAttendanceService;
