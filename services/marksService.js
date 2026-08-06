const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const XLSX = require('xlsx');

const MAX_WEIGHTS = {
  st1: 10, ws: 10, mid_exam: 20, project: 10, 
  st2: 10, home_class_work: 5, class_activity: 5, final_exam: 30
};

const validateScores = (data) => {
  const errors = [];
  for (const [key, max] of Object.entries(MAX_WEIGHTS)) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      const val = parseFloat(data[key]);
      if (isNaN(val)) {
        errors.push(`${key} must be a valid number.`);
      } else if (val < 0 || val > max) {
        errors.push(`${key} exceeds the maximum allowed weight of ${max}%.`);
      }
    }
  }
  return errors;
};

class MarksService {
  static async getMarks(query) {
    const { search, year_id, term_id, section_id } = query;

    const whereEnrollment = {
      ...(year_id && year_id !== 'undefined' ? { academic_year_id: parseInt(year_id, 10) } : {}),
      ...(term_id && term_id !== 'undefined' ? { terms_id: parseInt(term_id, 10) } : {}),
      ...(section_id && section_id !== 'undefined' ? { sections_id: parseInt(section_id, 10) } : {})
    };

    const whereMarks = {
      enrollments: whereEnrollment,
      ...(search ? {
        OR: [
          { enrollments: { Student: { full_name: { contains: search } } } },
          { subjects: { name: { contains: search } } }
        ]
      } : {})
    };

    const results = await prisma.marks.findMany({
      where: whereMarks,
      include: {
        subjects: true,
        enrollments: {
          include: {
            Student: true,
            academic_year: true,
            terms: true,
            sections: true
          }
        }
      },
      orderBy: [
        { enrollments: { academic_year: { year_name: 'desc' } } },
        { enrollments: { terms: { term_name: 'desc' } } },
        { enrollments: { Student: { full_name: 'asc' } } }
      ]
    });

    return results.map(row => ({
      ...row,
      subjects_name: row.subjects?.name,
      subjects_grade_level: row.subjects?.grade_level,
      student_name: row.enrollments?.Student?.full_name,
      Sex: row.enrollments?.Student?.Sex,
      academic_year: row.enrollments?.academic_year?.year_name,
      term: row.enrollments?.terms?.term_name,
      section_name: row.enrollments?.sections?.name,
      section_grade_level: row.enrollments?.sections?.grade_level,
      grade_level: row.enrollments?.sections?.grade_level,
      section_id: row.enrollments?.sections_id,
      enrollment_status: row.enrollments?.status
    }));
  }

  static async createMark(data) {
    const { enrollment_id, subject_id, ...scores } = data;
    if (!enrollment_id || !subject_id) {
      throw new BadRequestError("Please select both a student and a subject.");
    }

    const enrollmentId = parseInt(enrollment_id, 10);
    const subjectId = parseInt(subject_id, 10);

    const enrollment = await prisma.enrollments.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (enrollment.status !== 'active') {
      throw new ForbiddenError("Cannot add marks for inactive enrollment");
    }

    const validationErrors = validateScores(scores);
    if (validationErrors.length > 0) {
      throw new BadRequestError(validationErrors.join(", "));
    }

    const existing = await prisma.marks.findFirst({
      where: {
        enrollments_id: enrollmentId,
        subjects_id: subjectId
      }
    });

    if (existing) {
      throw new BadRequestError('A record already exists for this student and subject.');
    }

    const toNum = (v) => (v !== undefined && v !== "" && v !== null ? parseFloat(v) : null);
    
    const processedScores = {
      st1: toNum(scores.st1), ws: toNum(scores.ws), mid_exam: toNum(scores.mid_exam), project: toNum(scores.project),
      st2: toNum(scores.st2), home_class_work: toNum(scores.home_class_work), class_activity: toNum(scores.class_activity), final_exam: toNum(scores.final_exam)
    };
    
    return await prisma.marks.create({
      data: {
        enrollments_id: enrollmentId,
        subjects_id: subjectId,
        ...processedScores
      }
    });
  }

  static async updateMark(id, scores) {
    const markId = parseInt(id, 10);
    const existing = await prisma.marks.findUnique({
      where: { id: markId },
      include: { enrollments: true }
    });

    if (!existing) {
      throw new NotFoundError("Mark not found");
    }

    if (existing.enrollments?.status !== 'active') {
      throw new ForbiddenError("This student is currently inactive. Marks for inactive students cannot be edited.");
    }

    const validationErrors = validateScores(scores);
    if (validationErrors.length > 0) {
      throw new BadRequestError(validationErrors.join(", "));
    }

    const updateData = {};
    const allowedFields = Object.keys(MAX_WEIGHTS);

    for (const key of allowedFields) {
      if (scores[key] !== undefined) {
        updateData[key] = (scores[key] === "" || scores[key] === null) ? null : parseFloat(scores[key]);
      }
    }

    return await prisma.marks.update({
      where: { id: markId },
      data: updateData
    });
  }

  static async deleteMark(id) {
    const markId = parseInt(id, 10);
    try {
      return await prisma.marks.delete({
        where: { id: markId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Mark not found");
      }
      throw err;
    }
  }

  static async getDropdowns() {
    const enrollments = await prisma.enrollments.findMany({
      where: { status: 'active' },
      include: {
        Student: true,
        sections: true,
        academic_year: true,
        terms: true
      }
    });

    const subjects = await prisma.subjects.findMany({
      orderBy: [{ grade_level: 'asc' }, { name: 'asc' }]
    });

    return {
      enrollments: enrollments.map(e => ({
        id: e.id,
        sections_id: e.sections_id,
        terms_id: e.terms_id,
        academic_year_id: e.academic_year_id,
        student_name: e.Student?.full_name,
        Sex: e.Student?.Sex,
        section_name: e.sections?.name,
        section_grade: e.sections?.grade_level,
        year_name: e.academic_year?.year_name,
        term_name: e.terms?.term_name
      })),
      subjects
    };
  }

  static async getMarksStats(query) {
    const { academic_year_id, term_id, section_id } = query;

    const whereEnrollment = {
      ...(academic_year_id ? { academic_year_id: parseInt(academic_year_id, 10) } : {}),
      ...(term_id ? { terms_id: parseInt(term_id, 10) } : {}),
      ...(section_id ? { sections_id: parseInt(section_id, 10) } : {})
    };

    const marks = await prisma.marks.findMany({
      where: { enrollments: whereEnrollment }
    });

    const totalStudents = new Set(marks.map(m => m.enrollments_id)).size;
    const totalSubjects = new Set(marks.map(m => m.subjects_id)).size;
    const scores = marks.map(m => parseFloat(m.total_score)).filter(s => !isNaN(s));

    const overall_average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "0.00";
    const passing_count = scores.filter(s => s >= 50).length;
    const failing_count = scores.filter(s => s < 50).length;
    const highest_score = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest_score = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      total_students: totalStudents,
      total_subjects: totalSubjects,
      overall_average,
      passing_count,
      failing_count,
      highest_score,
      lowest_score
    };
  }
}

module.exports = MarksService;
