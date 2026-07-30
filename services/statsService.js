const prisma = require('../config/prisma');

class StatsService {
  static async getStats(query) {
    const { year, term } = query;

    const totalStudents = await prisma.student.count();
    const totalTeachers = await prisma.teachers.count();
    const totalSections = await prisma.sections.count({ where: { status: 'active' } });

    // Students per year/term
    const enrollmentWhere = {
      ...(year ? { academic_year: { year_name: year } } : {}),
      ...(term ? { terms: { term_name: term } } : {})
    };

    const enrollments = await prisma.enrollments.groupBy({
      by: ['academic_year_id', 'terms_id'],
      _count: { student_id: true },
      where: enrollmentWhere
    });

    // Resolve year/term names
    const academicYears = await prisma.academic_year.findMany();
    const terms = await prisma.terms.findMany();

    const studentsPerYearTerm = enrollments.map(e => ({
      academic_year: academicYears.find(y => y.id === e.academic_year_id)?.year_name,
      term: terms.find(t => t.id === e.terms_id)?.term_name,
      student_count: e._count.student_id
    }));

    // Sections per grade
    const sectionsPerGrade = await prisma.sections.groupBy({
      by: ['grade_level'],
      _count: { id: true },
      where: { status: 'active' },
      orderBy: { grade_level: 'asc' }
    });

    return {
      totalStudents,
      studentsPerYearTerm,
      totalTeachers,
      totalSections,
      sectionsPerGrade: sectionsPerGrade.map(s => ({
        grade_level: s.grade_level,
        section_count: s._count.id
      }))
    };
  }
}

module.exports = StatsService;
