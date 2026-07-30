const prisma = require('../config/prisma');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

class AdminAttendanceService {
  static async getAttendanceDashboard(query) {
    const { year_id, term_id, section_id, start_date, end_date } = query;

    const whereEnrollment = {
      ...(year_id && year_id !== 'all' ? { academic_year_id: parseInt(year_id, 10) } : {}),
      ...(term_id && term_id !== 'all' ? { terms_id: parseInt(term_id, 10) } : {}),
      ...(section_id && section_id !== 'all' ? { sections_id: parseInt(section_id, 10) } : {})
    };

    const summaries = await prisma.attendance_summary.findMany({
      where: { enrollments: whereEnrollment },
      include: {
        enrollments: {
          include: {
            Student: true,
            sections: true
          }
        }
      }
    });

    const totalStudents = new Set(summaries.map(s => s.enrollments.student_id)).size;
    let sumPercentage = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let maleStudents = 0;
    let femaleStudents = 0;

    summaries.forEach(s => {
      sumPercentage += parseFloat(s.percentage) || 0;
      totalPresent += s.total_present || 0;
      totalAbsent += s.total_absent || 0;
      totalLate += s.total_late || 0;
      totalExcused += s.total_excused || 0;
      if (s.enrollments?.Student?.Sex === 'M') maleStudents++;
      if (s.enrollments?.Student?.Sex === 'F') femaleStudents++;
    });

    const avgAttendance = summaries.length > 0 ? (sumPercentage / summaries.length).toFixed(2) : "0.00";

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: todayDate,
        enrollments: whereEnrollment
      }
    });

    const todayPresent = todayAttendance.filter(a => a.status === 'present').length;
    const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
    const todayLate = todayAttendance.filter(a => a.status === 'late').length;
    const todayExcused = todayAttendance.filter(a => a.status === 'excused').length;

    // Top and Low Performers
    const topPerformers = summaries
      .filter(s => (parseFloat(s.percentage) || 0) >= 90)
      .sort((a, b) => (parseFloat(b.percentage) || 0) - (parseFloat(a.percentage) || 0))
      .slice(0, 10)
      .map(s => ({
        name: s.enrollments.Student.full_name,
        section: `${s.enrollments.sections.grade_level}${s.enrollments.sections.name}`,
        percentage: parseFloat(s.percentage).toFixed(2)
      }));

    const lowPerformers = summaries
      .filter(s => (parseFloat(s.percentage) || 0) < 75)
      .sort((a, b) => (parseFloat(a.percentage) || 0) - (parseFloat(b.percentage) || 0))
      .slice(0, 10)
      .map(s => ({
        name: s.enrollments.Student.full_name,
        section: `${s.enrollments.sections.grade_level}${s.enrollments.sections.name}`,
        percentage: parseFloat(s.percentage).toFixed(2)
      }));

    return {
      overview: {
        totalStudents,
        avgAttendance,
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused,
        maleStudents,
        femaleStudents,
        todayPresent,
        todayAbsent,
        todayLate,
        todayExcused
      },
      topPerformers,
      lowPerformers
    };
  }

  static async recalculateSummary(enrollmentId) {
    const records = await prisma.attendance.findMany({
      where: { enrollment_id: parseInt(enrollmentId, 10) }
    });

    const total_days = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const percentage = total_days > 0 ? (present / total_days * 100) : 0;

    await prisma.attendance_summary.upsert({
      where: { enrollment_id: parseInt(enrollmentId, 10) },
      update: {
        total_present: present,
        total_absent: absent,
        total_late: late,
        total_excused: excused,
        total_days,
        percentage
      },
      create: {
        enrollment_id: parseInt(enrollmentId, 10),
        total_present: present,
        total_absent: absent,
        total_late: late,
        total_excused: excused,
        total_days,
        percentage
      }
    });

    return { present, absent, late, excused, total_days, percentage: percentage.toFixed(2) };
  }
}

module.exports = AdminAttendanceService;
