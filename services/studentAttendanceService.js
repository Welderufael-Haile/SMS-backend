const prisma = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');
const StudentService = require('./studentService');

class StudentAttendanceService {
  static async getStudentAttendance(user) {
    const student = await StudentService.getStudentByUserId(user);

    if (!student) throw new NotFoundError("Student not found");

    const enrollment = await prisma.enrollments.findFirst({
      where: { student_id: student.id, status: 'active' },
      include: { academic_year: true, terms: true, sections: true }
    });

    const history = await prisma.attendance.findMany({
      where: { enrollments: { student_id: student.id } },
      include: { enrollments: true },
      orderBy: { date: 'desc' }
    });

    const total = history.length;
    const present = history.filter(a => a.status === 'present').length;
    const absent = history.filter(a => a.status === 'absent').length;
    const late = history.filter(a => a.status === 'late').length;
    const excused = history.filter(a => a.status === 'excused').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    return {
      enrollment: enrollment ? {
        enrollment_id: enrollment.id,
        year_name: enrollment.academic_year?.year_name,
        term_name: enrollment.terms?.term_name,
        section: `${enrollment.sections?.grade_level}${enrollment.sections?.name}`
      } : null,
      history: history.map(a => ({
        ...a,
        formatted_date: a.date ? a.date.toISOString().split('T')[0] : null,
        day_name: a.date ? new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' }) : null
      })),
      statistics: { total_days: total, present, absent, late, excused, percentage }
    };
  }

  static async getAttendanceByTerm(user, termId) {
    const student = await StudentService.getStudentByUserId(user);

    if (!student) throw new NotFoundError("Student not found");

    const history = await prisma.attendance.findMany({
      where: {
        enrollments: {
          student_id: student.id,
          terms_id: parseInt(termId, 10)
        }
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
        formatted_date: a.date ? a.date.toISOString().split('T')[0] : null,
        day_name: a.date ? new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' }) : null
      })),
      statistics: { total_days: total, present, absent, late, excused, percentage }
    };
  }
}

module.exports = StudentAttendanceService;
