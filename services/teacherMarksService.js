const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

const MAX_WEIGHTS = {
  st1: 10, ws: 10, mid_exam: 20, project: 10,
  st2: 10, home_class_work: 5, class_activity: 5, final_exam: 30
};

const validateScores = (data) => {
  const errors = [];
  for (const [key, max] of Object.entries(MAX_WEIGHTS)) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      const val = parseFloat(data[key]);
      if (isNaN(val)) errors.push(`${key} must be a valid number.`);
      else if (val < 0 || val > max) errors.push(`${key} exceeds the maximum allowed weight of ${max}%.`);
    }
  }
  return errors;
};

const getTeacherByUserId = async (userId) => {
  const teacher = await prisma.teachers.findFirst({
    where: { user_id: parseInt(userId, 10) }
  });
  if (!teacher) throw new NotFoundError("Teacher not found");
  return teacher;
};

class TeacherMarksService {
  static async getMarksByTeacherUserId(userId) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true }
    });

    const marks = await prisma.marks.findMany({
      where: {
        enrollments: {
          sections_id: { in: assignments.map(a => a.section_id) },
          academic_year_id: { in: assignments.map(a => a.academic_year_id) }
        }
      },
      include: {
        subjects: true,
        enrollments: {
          include: {
            Student: true,
            sections: true,
            academic_year: true,
            terms: true
          }
        }
      },
      orderBy: [
        { enrollments: { Student: { full_name: 'asc' } } },
        { subjects: { name: 'asc' } }
      ]
    });

    return marks.map(m => ({
      ...m,
      enrollment_id: m.enrollments_id,
      student_name: m.enrollments?.Student?.full_name,
      subject_name: m.subjects?.name,
      grade_level: m.subjects?.grade_level,
      section_name: m.enrollments?.sections?.name,
      section_grade: m.enrollments?.sections?.grade_level,
      year_name: m.enrollments?.academic_year?.year_name,
      term_name: m.enrollments?.terms?.term_name,
      enrollment_status: m.enrollments?.status
    }));
  }

  static async getStudentsWithMarks(userId) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true }
    });

    const sectionIds = assignments.map(a => a.section_id);
    const yearIds = assignments.map(a => a.academic_year_id);

    const marks = await prisma.marks.findMany({
      where: {
        enrollments: {
          sections_id: { in: sectionIds },
          academic_year_id: { in: yearIds },
          status: 'active'
        }
      },
      include: {
        subjects: true,
        enrollments: {
          include: {
            Student: true,
            sections: true,
            academic_year: true,
            terms: true
          }
        }
      },
      orderBy: { enrollments: { Student: { full_name: 'asc' } } }
    });

    const grouped = {};
    marks.forEach(m => {
      const sid = m.enrollments?.student_id;
      if (!grouped[sid]) {
        grouped[sid] = {
          student_id: sid,
          full_name: m.enrollments?.Student?.full_name,
          gender: m.enrollments?.Student?.Sex,
          section: `${m.enrollments?.sections?.grade_level}${m.enrollments?.sections?.name}`,
          enrollment_status: m.enrollments?.status,
          subjects: []
        };
      }
      grouped[sid].subjects.push({
        mark_id: m.id,
        name: m.subjects?.name,
        st1: m.st1, ws: m.ws, mid_exam: m.mid_exam, project: m.project,
        st2: m.st2, home_class_work: m.home_class_work,
        class_activity: m.class_activity, final_exam: m.final_exam,
        total_score: m.total_score,
        term: m.enrollments?.terms?.term_name,
        year: m.enrollments?.academic_year?.year_name
      });
    });

    return Object.values(grouped);
  }

  static async getDropdowns(userId) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true },
      include: { subjects: true }
    });

    const subjectIds = [...new Set(assignments.map(a => a.subject_id))];
    const sectionIds = [...new Set(assignments.map(a => a.section_id))];
    const yearIds = [...new Set(assignments.map(a => a.academic_year_id))];

    const subjects = await prisma.subjects.findMany({
      where: { id: { in: subjectIds } }
    });

    const enrollments = await prisma.enrollments.findMany({
      where: {
        sections_id: { in: sectionIds },
        academic_year_id: { in: yearIds },
        status: 'active'
      },
      include: {
        Student: true,
        sections: true,
        terms: true,
        academic_year: true
      },
      orderBy: { Student: { full_name: 'asc' } }
    });

    return {
      subjects,
      enrollments: enrollments.map(e => ({
        id: e.id,
        display_text: `${e.Student?.full_name} - (${e.sections?.grade_level}${e.sections?.name}, ${e.terms?.term_name} ${e.academic_year?.year_name})`,
        student_name: e.Student?.full_name,
        section_name: `${e.sections?.grade_level}${e.sections?.name}`,
        grade_level: e.sections?.grade_level,
        term_name: e.terms?.term_name,
        year_name: e.academic_year?.year_name,
        status: e.status
      }))
    };
  }

  static async addTeacherMark(userId, data) {
    const teacher = await getTeacherByUserId(userId);
    const { enrollments_id, subjects_id, ...scores } = data;
    const enrollmentId = parseInt(enrollments_id, 10);
    const subjectId = parseInt(subjects_id, 10);

    const enrollment = await prisma.enrollments.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment) throw new NotFoundError("Enrollment not found");
    if (enrollment.status !== 'active') throw new ForbiddenError("Cannot add marks for inactive enrollment");

    // Verify teacher assignment
    const assignment = await prisma.teacher_section_subjects.findFirst({
      where: {
        teacher_id: teacher.id,
        section_id: enrollment.sections_id,
        subject_id: subjectId,
        academic_year_id: enrollment.academic_year_id,
        is_active: true
      }
    });

    if (!assignment) throw new ForbiddenError("Unauthorized: You are not assigned to teach this subject in this section");

    const errors = validateScores(scores);
    if (errors.length > 0) throw new BadRequestError(errors.join(", "));

    const existing = await prisma.marks.findFirst({
      where: { enrollments_id: enrollmentId, subjects_id: subjectId }
    });

    if (existing) throw new BadRequestError("Mark already exists for this student and subject.");

    const toNum = (v) => (v !== undefined && v !== "" ? parseFloat(v) : null);

    return await prisma.marks.create({
      data: {
        enrollments_id: enrollmentId,
        subjects_id: subjectId,
        st1: toNum(scores.st1), ws: toNum(scores.ws),
        mid_exam: toNum(scores.mid_exam), project: toNum(scores.project),
        st2: toNum(scores.st2), home_class_work: toNum(scores.home_class_work),
        class_activity: toNum(scores.class_activity), final_exam: toNum(scores.final_exam)
      }
    });
  }

  static async updateTeacherMark(userId, markId, scores) {
    const teacher = await getTeacherByUserId(userId);
    const id = parseInt(markId, 10);

    const mark = await prisma.marks.findUnique({
      where: { id },
      include: { enrollments: true }
    });

    if (!mark) throw new NotFoundError("Mark not found");
    if (mark.enrollments?.status !== 'active') throw new ForbiddenError("Cannot edit marks for inactive enrollment");

    const assignment = await prisma.teacher_section_subjects.findFirst({
      where: {
        teacher_id: teacher.id,
        section_id: mark.enrollments.sections_id,
        subject_id: mark.subjects_id,
        academic_year_id: mark.enrollments.academic_year_id,
        is_active: true
      }
    });

    if (!assignment) throw new ForbiddenError("Unauthorized: You are not assigned to teach this subject");

    const errors = validateScores(scores);
    if (errors.length > 0) throw new BadRequestError(errors.join(", "));

    const toNum = (v) => (v !== undefined && v !== "" && v !== null ? parseFloat(v) : null);

    return await prisma.marks.update({
      where: { id },
      data: {
        st1: toNum(scores.st1), ws: toNum(scores.ws),
        mid_exam: toNum(scores.mid_exam), project: toNum(scores.project),
        st2: toNum(scores.st2), home_class_work: toNum(scores.home_class_work),
        class_activity: toNum(scores.class_activity), final_exam: toNum(scores.final_exam)
      }
    });
  }

  static async getTeacherStats(userId) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true }
    });

    const sectionIds = assignments.map(a => a.section_id);
    const yearIds = assignments.map(a => a.academic_year_id);

    const marks = await prisma.marks.findMany({
      where: {
        enrollments: {
          sections_id: { in: sectionIds },
          academic_year_id: { in: yearIds },
          status: 'active'
        }
      },
      include: {
        enrollments: {
          include: { Student: true, sections: true, terms: true, academic_year: true }
        }
      }
    });

    const uniqueStudents = new Set(marks.map(m => m.enrollments?.student_id));
    const scores = marks.map(m => parseFloat(m.total_score)).filter(s => !isNaN(s));
    const failingMarks = marks.filter(m => (parseFloat(m.total_score) || 0) < 50);

    const getGender = (g) => {
      const gender = g?.toLowerCase();
      if (gender === 'male' || gender === 'm') return 'male';
      if (gender === 'female' || gender === 'f') return 'female';
      return 'other';
    };

    const uniqueFailingStudents = new Set(failingMarks.map(m => m.enrollments?.student_id));

    return {
      totalStudents: uniqueStudents.size,
      totalMarks: marks.length,
      averageScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      passingRate: marks.length > 0 ? ((marks.filter(m => (parseFloat(m.total_score) || 0) >= 50).length / marks.length) * 100).toFixed(2) : 0,
      failingStudents: {
        male: [...new Set(failingMarks.filter(m => getGender(m.enrollments?.Student?.Sex) === 'male').map(m => m.enrollments?.student_id))].length,
        female: [...new Set(failingMarks.filter(m => getGender(m.enrollments?.Student?.Sex) === 'female').map(m => m.enrollments?.student_id))].length,
        total: uniqueFailingStudents.size
      }
    };
  }
}

module.exports = TeacherMarksService;
