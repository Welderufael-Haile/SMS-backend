const prisma = require('../config/prisma');
const { NotFoundError, UnauthorizedError, BadRequestError } = require('../utils/errors');

class StudentService {
  static async getStudentByUserId(userId) {
    if (!userId) throw new UnauthorizedError("Unauthorized");
    
    const student = await prisma.student.findUnique({
      where: { user_id: parseInt(userId, 10) },
      include: {
        Users: {
          select: { email: true, full_name: true }
        }
      }
    });

    if (!student) {
      const user = await prisma.users.findUnique({
        where: { id: parseInt(userId, 10) }
      });

      if (!user) {
        throw new NotFoundError("User account not found.");
      }

      return {
        id: user.id,
        full_name: user.full_name,
        Sex: null,
        Date_of_birth: null,
        profile_photo: null,
        Users: { email: user.email },
        isVirtual: true
      };
    }
    return student;
  }

  static async getStudentDashboard(userId, query) {
    const student = await this.getStudentByUserId(userId);

    // Active enrollment
    const activeEnrollment = await prisma.enrollments.findFirst({
      where: {
        student_id: student.id,
        status: 'active'
      },
      include: {
        academic_year: true,
        terms: true,
        sections: true
      }
    });

    // Pagination for history
    const pageNum = Math.max(1, parseInt(query.history_page, 10) || 1);
    const limitNum = Math.min(20, Math.max(1, parseInt(query.history_limit, 10) || 5));
    const skip = (pageNum - 1) * limitNum;

    const historyWhere = {
      student_id: student.id,
      status: { in: ['completed', 'promoted', 'repeated'] }
    };

    const totalItems = await prisma.enrollments.count({ where: historyWhere });
    const totalPages = Math.ceil(totalItems / limitNum);

    const historyRecords = await prisma.enrollments.findMany({
      where: historyWhere,
      include: {
        academic_year: true,
        terms: true,
        sections: true
      },
      orderBy: [
        { academic_year: { year_name: 'desc' } },
        { terms_id: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Stats calculations
    const allEnrollments = await prisma.enrollments.findMany({
      where: {
        student_id: student.id,
        final_average: { not: null }
      }
    });

    const uniqueYears = new Set(allEnrollments.map(e => e.academic_year_id)).size;
    const totalEnrollmentsCount = allEnrollments.length;
    const avgSum = allEnrollments.reduce((acc, curr) => acc + (parseFloat(curr.final_average) || 0), 0);
    const overall_average = totalEnrollmentsCount > 0 ? (avgSum / totalEnrollmentsCount).toFixed(2) : "0.00";
    const promotions = allEnrollments.filter(e => e.status === 'promoted').length;
    const repetitions = allEnrollments.filter(e => e.status === 'repeated').length;

    const formattedHistory = historyRecords.map(record => ({
      year_name: record.academic_year?.year_name,
      term_name: record.terms?.term_name,
      section_name: record.sections?.name,
      grade_level: record.sections?.grade_level,
      status: record.status,
      final_average: record.final_average ? parseFloat(record.final_average).toFixed(2) : null,
      completed_at: record.completed_at,
      promotion_note: record.promotion_note
    }));

    return {
      profile: {
        id: student.id,
        full_name: student.full_name,
        Sex: student.Sex,
        Date_of_birth: student.Date_of_birth,
        profile_photo: student.profile_photo,
        email: student.Users?.email
      },
      currentEnrollment: activeEnrollment ? {
        ...activeEnrollment,
        year_name: activeEnrollment.academic_year?.year_name,
        term_name: activeEnrollment.terms?.term_name,
        section_name: activeEnrollment.sections?.name,
        grade_level: activeEnrollment.sections?.grade_level
      } : null,
      academicHistory: {
        data: formattedHistory,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum
        }
      },
      stats: {
        total_years: uniqueYears,
        total_enrollments: totalEnrollmentsCount,
        overall_average,
        promotions,
        repetitions
      }
    };
  }

  static async getStudentMarks(userId, query) {
    const student = await this.getStudentByUserId(userId);
    const { year_id, term_id, page = 1, limit = 10 } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const whereEnrollment = {
      student_id: student.id,
      ...(year_id && year_id !== 'undefined' ? { academic_year_id: parseInt(year_id, 10) } : {}),
      ...(term_id && term_id !== 'undefined' ? { terms_id: parseInt(term_id, 10) } : {})
    };

    const marksWhere = {
      enrollments: whereEnrollment
    };

    const allMarks = await prisma.marks.findMany({
      where: marksWhere,
      include: {
        subjects: true,
        enrollments: {
          include: {
            academic_year: true,
            terms: true,
            sections: true
          }
        }
      },
      orderBy: [
        { enrollments: { academic_year: { year_name: 'desc' } } },
        { enrollments: { terms_id: 'desc' } },
        { subjects: { name: 'asc' } }
      ]
    });

    const grouped = {};
    allMarks.forEach(mark => {
      const e = mark.enrollments;
      const key = `${e.academic_year.year_name}-${e.terms.term_name}`;
      if (!grouped[key]) {
        grouped[key] = {
          academic_year: e.academic_year.year_name,
          term: e.terms.term_name,
          term_id: e.terms_id,
          year_id: e.academic_year_id,
          section: `${e.sections.grade_level}${e.sections.name}`,
          subjects: []
        };
      }
      grouped[key].subjects.push({
        name: mark.subjects.name,
        st1: mark.st1 !== null ? parseFloat(mark.st1) : null,
        ws: mark.ws !== null ? parseFloat(mark.ws) : null,
        mid_exam: mark.mid_exam !== null ? parseFloat(mark.mid_exam) : null,
        project: mark.project !== null ? parseFloat(mark.project) : null,
        st2: mark.st2 !== null ? parseFloat(mark.st2) : null,
        home_class_work: mark.home_class_work !== null ? parseFloat(mark.home_class_work) : null,
        class_activity: mark.class_activity !== null ? parseFloat(mark.class_activity) : null,
        final_exam: mark.final_exam !== null ? parseFloat(mark.final_exam) : null,
        total_score: mark.total_score !== null ? parseFloat(mark.total_score) : null
      });
    });

    const groupedValues = Object.values(grouped);
    const totalTerms = groupedValues.length;
    const paginatedData = groupedValues.slice(skip, skip + limitNum);

    return {
      data: paginatedData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalTerms / limitNum),
        totalItems: totalTerms,
        itemsPerPage: limitNum
      }
    };
  }

  static async getStudentFilters(userId, query) {
    const student = await this.getStudentByUserId(userId);

    const yearPage = Math.max(1, parseInt(query.year_page, 10) || 1);
    const yearLimit = Math.min(100, Math.max(1, parseInt(query.year_limit, 10) || 20));
    const skip = (yearPage - 1) * yearLimit;

    const enrollments = await prisma.enrollments.findMany({
      where: { student_id: student.id },
      include: {
        academic_year: true,
        terms: true
      }
    });

    const yearsMap = new Map();
    const termsMap = new Map();

    enrollments.forEach(e => {
      if (e.academic_year) {
        yearsMap.set(e.academic_year.id, { id: e.academic_year.id, year_name: e.academic_year.year_name });
      }
      if (e.terms) {
        termsMap.set(e.terms.id, { id: e.terms.id, term_name: e.terms.term_name });
      }
    });

    const allYears = Array.from(yearsMap.values()).sort((a, b) => b.year_name.localeCompare(a.year_name));
    const allTerms = Array.from(termsMap.values()).sort((a, b) => a.id - b.id);

    const totalYears = allYears.length;
    const paginatedYears = allYears.slice(skip, skip + yearLimit);

    return {
      years: {
        data: paginatedYears,
        pagination: {
          currentPage: yearPage,
          totalPages: Math.ceil(totalYears / yearLimit),
          totalItems: totalYears,
          itemsPerPage: yearLimit
        }
      },
      terms: allTerms
    };
  }

  static async getStudentReportCard(userId, yearId, termId) {
    const student = await this.getStudentByUserId(userId);

    if (!yearId || !termId) {
      throw new BadRequestError("Year ID and Term ID are required");
    }

    const enrollment = await prisma.enrollments.findFirst({
      where: {
        student_id: student.id,
        academic_year_id: parseInt(yearId, 10),
        terms_id: parseInt(termId, 10)
      },
      include: {
        academic_year: true,
        terms: true,
        sections: true
      }
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found for this term");
    }

    const marks = await prisma.marks.findMany({
      where: { enrollments_id: enrollment.id },
      include: { subjects: true },
      orderBy: { subjects: { name: 'asc' } }
    });

    let totalScore = 0;
    let validSubjects = 0;

    const subjectDetails = marks.map(mark => {
      const total = mark.total_score ? parseFloat(mark.total_score) : 0;
      if (total > 0) {
        totalScore += total;
        validSubjects++;
      }
      return {
        subject_name: mark.subjects.name,
        st1: mark.st1 !== null ? parseFloat(mark.st1) : null,
        ws: mark.ws !== null ? parseFloat(mark.ws) : null,
        mid_exam: mark.mid_exam !== null ? parseFloat(mark.mid_exam) : null,
        project: mark.project !== null ? parseFloat(mark.project) : null,
        st2: mark.st2 !== null ? parseFloat(mark.st2) : null,
        home_class_work: mark.home_class_work !== null ? parseFloat(mark.home_class_work) : null,
        class_activity: mark.class_activity !== null ? parseFloat(mark.class_activity) : null,
        final_exam: mark.final_exam !== null ? parseFloat(mark.final_exam) : null,
        total_score: total > 0 ? total : null
      };
    });

    const termAverage = validSubjects > 0 ? (totalScore / validSubjects).toFixed(2) : "0.00";
    const passingSubjects = marks.filter(m => (parseFloat(m.total_score) || 0) >= 50).length;

    return {
      student: {
        name: student.full_name,
        sex: student.Sex,
        dob: student.Date_of_birth
      },
      enrollment: {
        year: enrollment.academic_year?.year_name,
        term: enrollment.terms?.term_name,
        section: `${enrollment.sections?.grade_level} ${enrollment.sections?.name}`,
        status: enrollment.status,
        final_average: enrollment.final_average ? parseFloat(enrollment.final_average).toFixed(2) : null
      },
      marks: subjectDetails,
      statistics: {
        subjectsCount: marks.length,
        termAverage,
        passingSubjects,
        failingSubjects: marks.length - passingSubjects
      }
    };
  }
}

module.exports = StudentService;
