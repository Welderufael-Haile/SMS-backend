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

    const whereAttendance = { enrollments: whereEnrollment };
    if (start_date && end_date) {
      whereAttendance.date = { gte: new Date(start_date), lte: new Date(end_date) };
    } else if (start_date) {
      whereAttendance.date = { gte: new Date(start_date) };
    } else if (end_date) {
      whereAttendance.date = { lte: new Date(end_date) };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereAttendance,
      include: {
        enrollments: {
          include: { 
            terms: true,
            Student: true,
            sections: true
          }
        }
      }
    });

    const studentMap = {}; // enrollment_id -> { total: 0, present: 0, absent: 0, late: 0, excused: 0, sex, name, section }
    const sectionMap = {};

    let todayPresent = 0;
    let todayAbsent = 0;
    let todayLate = 0;
    let todayExcused = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    attendances.forEach(a => {
      const eid = a.enrollment_id;
      const sDateStr = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
      
      if (!studentMap[eid]) {
        studentMap[eid] = { 
          total: 0, present: 0, absent: 0, late: 0, excused: 0,
          sex: a.enrollments?.Student?.Sex,
          name: a.enrollments?.Student?.full_name,
          section: `${a.enrollments?.sections?.grade_level}${a.enrollments?.sections?.name}`
        };
      }
      
      const secName = studentMap[eid].section;
      if (!sectionMap[secName]) {
        sectionMap[secName] = { name: secName, total: 0, present: 0, absent: 0, late: 0 };
      }

      studentMap[eid].total++;
      sectionMap[secName].total++;

      if (a.status === 'present') { studentMap[eid].present++; sectionMap[secName].present++; }
      else if (a.status === 'absent') { studentMap[eid].absent++; sectionMap[secName].absent++; }
      else if (a.status === 'late') { studentMap[eid].late++; sectionMap[secName].late++; }
      else if (a.status === 'excused') { studentMap[eid].excused++; }

      if (sDateStr === todayStr) {
        if (a.status === 'present') todayPresent++;
        else if (a.status === 'absent') todayAbsent++;
        else if (a.status === 'late') todayLate++;
        else if (a.status === 'excused') todayExcused++;
      }
    });

    let maleStudents = 0;
    let femaleStudents = 0;
    let sumPercentage = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    
    const studentPerformance = [];

    Object.values(studentMap).forEach(s => {
      if (s.sex === 'M') maleStudents++;
      else if (s.sex === 'F') femaleStudents++;
      
      totalPresent += s.present;
      totalAbsent += s.absent;
      totalLate += s.late;
      totalExcused += s.excused;

      const perc = s.total > 0 ? (s.present / s.total) * 100 : 0;
      sumPercentage += perc;
      
      studentPerformance.push({
        name: s.name,
        section: s.section,
        percentage: perc.toFixed(2)
      });
    });

    const totalStudents = Object.keys(studentMap).length;
    const avgAttendance = totalStudents > 0 ? (sumPercentage / totalStudents).toFixed(2) : "0.00";

    const topPerformers = studentPerformance
      .filter(s => parseFloat(s.percentage) >= 90)
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
      .slice(0, 10);

    const lowPerformers = studentPerformance
      .filter(s => parseFloat(s.percentage) < 75)
      .sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage))
      .slice(0, 10);

    const genderStats = [
      { name: 'Male', value: maleStudents, color: '#3b82f6' },
      { name: 'Female', value: femaleStudents, color: '#ec4899' }
    ];

    const sectionStats = Object.values(sectionMap).map(sec => ({
      name: sec.name,
      percentage: sec.total > 0 ? ((sec.present / sec.total) * 100).toFixed(2) : "0.00",
      present: sec.present,
      absent: sec.absent,
      late: sec.late
    }));

    const dailyMap = {};
    const weeklyMap = {};
    const monthlyMap = {};
    const termMap = {};

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    attendances.forEach(a => {
      if (!a.date) return;
      const d = new Date(a.date);
      const dateStr = d.toISOString().split('T')[0];
      const dayStr = dayNames[d.getDay()];
      const monthStr = monthNames[d.getMonth()];
      const termStr = a.enrollments?.terms?.term_name || 'Unknown';

      // Initialize maps
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, total: 0, present: 0, absent: 0, late: 0 };
      if (!weeklyMap[dayStr]) weeklyMap[dayStr] = { day: dayStr, total: 0, present: 0, absent: 0, late: 0 };
      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { month: monthStr, total: 0, present: 0, absent: 0, late: 0 };
      if (!termMap[termStr]) termMap[termStr] = { term: termStr, total: 0, present: 0, absent: 0, late: 0 };

      // Increment counts
      const status = a.status;
      if (['present', 'absent', 'late'].includes(status)) {
        dailyMap[dateStr][status]++;
        weeklyMap[dayStr][status]++;
        monthlyMap[monthStr][status]++;
        termMap[termStr][status]++;
      }
      dailyMap[dateStr].total++;
      weeklyMap[dayStr].total++;
      monthlyMap[monthStr].total++;
      termMap[termStr].total++;
    });

    const calcPerc = (val, total) => total > 0 ? parseFloat(((val / total) * 100).toFixed(2)) : 0;

    const formatTrend = (map, keyField) => Object.values(map).map(m => ({
      [keyField]: m[keyField],
      present: calcPerc(m.present, m.total),
      absent: calcPerc(m.absent, m.total),
      late: calcPerc(m.late, m.total)
    }));

    const dailyTrend = formatTrend(dailyMap, 'date').sort((a, b) => new Date(a.date) - new Date(b.date));
    const weeklyTrend = dayNames.map(day => formatTrend(weeklyMap, 'day').find(w => w.day === day) || { day, present: 0, absent: 0, late: 0 });
    const monthlyTrend = monthNames.map(month => formatTrend(monthlyMap, 'month').find(m => m.month === month) || { month, present: 0, absent: 0, late: 0 }).filter(m => monthlyMap[m.month]); // Filter out months with no data for a cleaner chart
    const termComparison = formatTrend(termMap, 'term');

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
      lowPerformers,
      genderStats,
      sectionStats,
      dailyTrend,
      weeklyTrend,
      monthlyTrend,
      termComparison
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
