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

    const isHomeTeacher = assignments.some(a => a.is_home_teacher === true);

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
      is_home_teacher: isHomeTeacher,
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
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = date < todayStr;
    const isFutureDate = date > todayStr;

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

        if (isPastDate || isFutureDate) {
          throw new Error("Attendance can only be taken for today.");
        }

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

  static async getTodaySummary(userId, dateStr) {
    const teacher = await getTeacherByUserId(userId);
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);

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
        attendance: { where: { date: targetDate } }
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
      date: targetDate.toISOString().split('T')[0],
      sections: Object.values(summaryMap)
    };
  }

  static async _getTeacherEnrollmentsForReports(teacher, section_id, term_id) {
    const assignments = await prisma.teacher_section_subjects.findMany({
      where: {
        teacher_id: teacher.id,
        is_active: true,
        ...(section_id ? { section_id: parseInt(section_id, 10) } : {})
      }
    });

    const sectionIds = [...new Set(assignments.map(a => a.section_id))];
    if (sectionIds.length === 0) return [];

    const enrollments = await prisma.enrollments.findMany({
      where: {
        sections_id: { in: sectionIds },
        status: 'active',
        ...(term_id ? { terms_id: parseInt(term_id, 10) } : {})
      },
      include: {
        attendance: true,
        terms: true,
        academic_year: true
      }
    });
    
    return enrollments;
  }

  static async getDailyReport(userId, query) {
    const { section_id, term_id, month, year } = query;
    const teacher = await getTeacherByUserId(userId);
    const enrollments = await this._getTeacherEnrollmentsForReports(teacher, section_id, term_id);
    
    const targetMonth = month ? parseInt(month, 10) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    const dailyData = {};
    let totalStudents = enrollments.length;

    enrollments.forEach(enrollment => {
      enrollment.attendance.forEach(att => {
        const d = new Date(att.date);
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          const dateStr = d.toISOString().split('T')[0];
          if (!dailyData[dateStr]) {
            dailyData[dateStr] = {
              date: dateStr,
              day: d.toLocaleDateString('en-US', { weekday: 'long' }),
              presentCount: 0,
              absentCount: 0,
              lateCount: 0,
              excusedCount: 0,
              total: 0
            };
          }
          
          dailyData[dateStr].total++;
          if (att.status === 'present') dailyData[dateStr].presentCount++;
          else if (att.status === 'absent') dailyData[dateStr].absentCount++;
          else if (att.status === 'late') dailyData[dateStr].lateCount++;
          else if (att.status === 'excused') dailyData[dateStr].excusedCount++;
        }
      });
    });

    const chartData = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
    let overallTotal = 0;
    let overallPresent = 0;

    chartData.forEach(day => {
      day.present = day.total > 0 ? Math.round((day.presentCount / day.total) * 100) : 0;
      day.absent = day.total > 0 ? Math.round((day.absentCount / day.total) * 100) : 0;
      day.late = day.total > 0 ? Math.round((day.lateCount / day.total) * 100) : 0;
      
      overallTotal += day.total;
      overallPresent += day.presentCount;
    });

    const average = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

    return {
      totalStudents,
      average,
      chartData
    };
  }

  static async getMonthlyReport(userId, query) {
    const { section_id, term_id, year } = query;
    const teacher = await getTeacherByUserId(userId);
    const enrollments = await this._getTeacherEnrollmentsForReports(teacher, section_id, term_id);
    
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const monthlyData = {};
    
    enrollments.forEach(enrollment => {
      enrollment.attendance.forEach(att => {
        const d = new Date(att.date);
        if (d.getFullYear() === targetYear) {
          const monthIdx = d.getMonth();
          const monthName = months[monthIdx];
          
          if (!monthlyData[monthName]) {
            monthlyData[monthName] = {
              month: monthName,
              monthIdx,
              presentCount: 0,
              absentCount: 0,
              lateCount: 0,
              excusedCount: 0,
              totalRecords: 0,
              uniqueDates: new Set()
            };
          }
          
          monthlyData[monthName].totalRecords++;
          monthlyData[monthName].uniqueDates.add(d.toISOString().split('T')[0]);
          
          if (att.status === 'present') monthlyData[monthName].presentCount++;
          else if (att.status === 'absent') monthlyData[monthName].absentCount++;
          else if (att.status === 'late') monthlyData[monthName].lateCount++;
          else if (att.status === 'excused') monthlyData[monthName].excusedCount++;
        }
      });
    });

    const chartData = Object.values(monthlyData).sort((a, b) => a.monthIdx - b.monthIdx);
    
    let overallTotal = 0;
    let overallPresent = 0;

    chartData.forEach(m => {
      m.totalDays = m.uniqueDates.size;
      m.present = m.totalRecords > 0 ? Math.round((m.presentCount / m.totalRecords) * 100) : 0;
      m.absent = m.totalRecords > 0 ? Math.round((m.absentCount / m.totalRecords) * 100) : 0;
      m.late = m.totalRecords > 0 ? Math.round((m.lateCount / m.totalRecords) * 100) : 0;
      
      overallTotal += m.totalRecords;
      overallPresent += m.presentCount;
    });
    
    const serializableChartData = chartData.map(m => {
      const { uniqueDates, monthIdx, ...rest } = m;
      return rest;
    });

    const average = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

    return {
      totalDays: serializableChartData.reduce((sum, m) => sum + m.totalDays, 0),
      average,
      chartData: serializableChartData
    };
  }

  static async getYearlyReport(userId, query) {
    // We ignore term_id so we get all terms for the year comparison
    const { section_id } = query; 
    const teacher = await getTeacherByUserId(userId);
    const enrollments = await this._getTeacherEnrollmentsForReports(teacher, section_id, null);
    
    const yearlyData = {};
    
    enrollments.forEach(enrollment => {
      const termName = enrollment.terms?.term_name || 'Unknown Term';
      const yearName = enrollment.academic_year?.year_name || 'Unknown Year';
      const key = `${termName}-${yearName}`;
      
      if (!yearlyData[key]) {
        yearlyData[key] = {
          term: termName,
          year: yearName,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          totalRecords: 0,
          uniqueDates: new Set()
        };
      }
      
      enrollment.attendance.forEach(att => {
        const d = new Date(att.date);
        
        yearlyData[key].totalRecords++;
        yearlyData[key].uniqueDates.add(d.toISOString().split('T')[0]);
        
        if (att.status === 'present') yearlyData[key].presentCount++;
        else if (att.status === 'absent') yearlyData[key].absentCount++;
        else if (att.status === 'late') yearlyData[key].lateCount++;
        else if (att.status === 'excused') yearlyData[key].excusedCount++;
      });
    });

    const chartData = Object.values(yearlyData).filter(t => t.totalRecords > 0);
    
    let overallTotal = 0;
    let overallPresent = 0;

    chartData.forEach(t => {
      t.totalDays = t.uniqueDates.size;
      t.present = t.totalRecords > 0 ? Math.round((t.presentCount / t.totalRecords) * 100) : 0;
      t.absent = t.totalRecords > 0 ? Math.round((t.absentCount / t.totalRecords) * 100) : 0;
      t.late = t.totalRecords > 0 ? Math.round((t.lateCount / t.totalRecords) * 100) : 0;
      
      overallTotal += t.totalRecords;
      overallPresent += t.presentCount;
    });
    
    const serializableChartData = chartData.map(t => {
      const { uniqueDates, ...rest } = t;
      return rest;
    });

    const average = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

    return {
      totalTerms: serializableChartData.length,
      average,
      chartData: serializableChartData
    };
  }
}

module.exports = TeacherAttendanceService;
