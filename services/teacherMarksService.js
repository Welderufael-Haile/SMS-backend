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

    const orConditions = assignments.length > 0 ? assignments.map(a => {
      if (a.is_home_teacher) {
        return {
          enrollments: { sections_id: a.section_id, academic_year_id: a.academic_year_id }
        };
      } else {
        return {
          enrollments: { sections_id: a.section_id, academic_year_id: a.academic_year_id },
          subjects_id: a.subject_id
        };
      }
    }) : [{ id: -1 }];

    const marks = await prisma.marks.findMany({
      where: {
        OR: orConditions
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

    const orConditions = assignments.length > 0 ? assignments.map(a => {
      if (a.is_home_teacher) {
        return {
          enrollments: { sections_id: a.section_id, academic_year_id: a.academic_year_id, status: 'active' }
        };
      } else {
        return {
          enrollments: { sections_id: a.section_id, academic_year_id: a.academic_year_id, status: 'active' },
          subjects_id: a.subject_id
        };
      }
    }) : [{ id: -1 }];

    const marks = await prisma.marks.findMany({
      where: {
        OR: orConditions
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
        subject_id: m.subjects_id,
        name: m.subjects?.name,
        st1: m.st1, ws: m.ws, mid_exam: m.mid_exam, project: m.project,
        st2: m.st2, home_class_work: m.home_class_work,
        class_activity: m.class_activity, final_exam: m.final_exam,
        total_score: m.total_score,
        term: m.enrollments?.terms?.term_name,
        year: m.enrollments?.academic_year?.year_name,
        is_editable: assignments.some(a => 
          a.section_id === m.enrollments?.sections_id &&
          a.academic_year_id === m.enrollments?.academic_year_id &&
          a.subject_id === m.subjects_id
        )
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

    const toNum = (v) => {
      if (v !== undefined && v !== "" && v !== null) {
        const num = parseFloat(v);
        return isNaN(num) ? null : parseFloat(num.toFixed(2));
      }
      return null;
    };

    const processedScores = {
      st1: toNum(scores.st1), ws: toNum(scores.ws),
      mid_exam: toNum(scores.mid_exam), project: toNum(scores.project),
      st2: toNum(scores.st2), home_class_work: toNum(scores.home_class_work),
      class_activity: toNum(scores.class_activity), final_exam: toNum(scores.final_exam)
    };

    // total_score is a generated column in MySQL, do not pass it in the insert/update
    const newMark = await prisma.marks.create({
      data: {
        enrollments_id: enrollmentId,
        subjects_id: subjectId,
        ...processedScores
      }
    });

    return await prisma.marks.findUnique({ where: { id: newMark.id } });
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

    const toNum = (v) => {
      if (v !== undefined && v !== "" && v !== null) {
        const num = parseFloat(v);
        return isNaN(num) ? null : parseFloat(num.toFixed(2));
      }
      return null;
    };

    const updateData = {
      st1: toNum(scores.st1), ws: toNum(scores.ws),
      mid_exam: toNum(scores.mid_exam), project: toNum(scores.project),
      st2: toNum(scores.st2), home_class_work: toNum(scores.home_class_work),
      class_activity: toNum(scores.class_activity), final_exam: toNum(scores.final_exam)
    };

    // total_score is a generated column in MySQL, do not pass it in the insert/update

    await prisma.marks.update({
      where: { id },
      data: updateData
    });

    return await prisma.marks.findUnique({ where: { id } });
  }

  static async getTeacherStats(userId) {
    const teacher = await getTeacherByUserId(userId);

    const assignments = await prisma.teacher_section_subjects.findMany({
      where: { teacher_id: teacher.id, is_active: true }
    });

    if (assignments.length === 0) {
      return { homeTeacher: null, subjectTeacher: null };
    }

    const currentYearId = Math.max(...assignments.map(a => a.academic_year_id));
    const currentAssignments = assignments.filter(a => a.academic_year_id === currentYearId);
    
    const homeAssignments = currentAssignments.filter(a => a.is_home_teacher);
    const subjectAssignments = currentAssignments.filter(a => !a.is_home_teacher);

    const homeConditions = homeAssignments.map(a => ({
      enrollments: { sections_id: a.section_id, academic_year_id: a.academic_year_id, status: 'active' }
    }));
    
    const subjectConditions = subjectAssignments.map(a => ({
      enrollments: { sections_id: a.section_id, academic_year_id: a.academic_year_id, status: 'active' },
      subjects_id: a.subject_id
    }));

    const fetchMarks = async (conditions) => {
      if (conditions.length === 0) return [];
      return await prisma.marks.findMany({
        where: { OR: conditions },
        include: {
          subjects: true,
          enrollments: {
            include: { Student: true, sections: true }
          }
        }
      });
    };

    const homeMarks = await fetchMarks(homeConditions);
    const subjectMarks = await fetchMarks(subjectConditions);

    const processMarks = (marksList) => {
      if (!marksList || marksList.length === 0) return null;
      
      let above50 = 0;
      let below50 = 0;
      const below50List = [];
      const students = new Set();

      let failingMale = 0;
      let failingFemale = 0;
      
      const sections = {};
      const termYears = {};

      const scores = marksList.map(m => parseFloat(m.total_score)).filter(s => !isNaN(s));
      const failingMarks = marksList.filter(m => (parseFloat(m.total_score) || 0) < 50);
      const uniqueFailingStudents = new Set();
      
      const getGender = (g) => {
        const gender = g?.toLowerCase();
        if (gender === 'male' || gender === 'm') return 'male';
        if (gender === 'female' || gender === 'f') return 'female';
        return 'other';
      };
      
      marksList.forEach(m => {
        students.add(m.enrollments?.student_id);
        const score = parseFloat(m.total_score) || 0;
        if (score >= 50) {
          above50++;
        } else {
          below50++;
          below50List.push({
            id: m.id,
            studentName: m.enrollments?.Student?.full_name || 'Unknown',
            section: `${m.enrollments?.sections?.grade_level || ''}${m.enrollments?.sections?.name || ''}`,
            subject: m.subjects?.name || 'Unknown',
            score: score
          });
        }
      });

      failingMarks.forEach(m => {
        const studentId = m.enrollments?.student_id;
        const gender = getGender(m.enrollments?.Student?.Sex);
        const secName = `${m.enrollments?.sections?.grade_level || ''}${m.enrollments?.sections?.name || ''}`;
        
        if (!uniqueFailingStudents.has(studentId)) {
          uniqueFailingStudents.add(studentId);
          if (gender === 'male') failingMale++;
          if (gender === 'female') failingFemale++;
        }

        if (!sections[secName]) {
          sections[secName] = { failing: { male: 0, female: 0, total: 0, _students: new Set() } };
        }
        if (!sections[secName].failing._students.has(studentId)) {
          sections[secName].failing._students.add(studentId);
          sections[secName].failing.total++;
          if (gender === 'male') sections[secName].failing.male++;
          if (gender === 'female') sections[secName].failing.female++;
        }

        const termName = `${m.enrollments?.terms?.term_name || ''} - ${m.enrollments?.academic_year?.year_name || ''}`;
        if (!termYears[termName]) {
          termYears[termName] = { failing: { male: 0, female: 0, total: 0, _students: new Set() } };
        }
        if (!termYears[termName].failing._students.has(studentId)) {
          termYears[termName].failing._students.add(studentId);
          termYears[termName].failing.total++;
          if (gender === 'male') termYears[termName].failing.male++;
          if (gender === 'female') termYears[termName].failing.female++;
        }
      });

      Object.values(sections).forEach(s => delete s.failing._students);
      Object.values(termYears).forEach(t => delete t.failing._students);
      
      return {
        totalStudents: students.size,
        totalMarks: marksList.length,
        averageScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
        passingRate: marksList.length > 0 ? ((above50 / marksList.length) * 100).toFixed(2) : 0,
        failingStudents: {
          male: failingMale,
          female: failingFemale,
          total: uniqueFailingStudents.size
        },
        sections,
        termYears,
        above50,
        below50,
        below50List: below50List.sort((a, b) => a.score - b.score)
      };
    };

    return {
      homeTeacher: processMarks(homeMarks),
      subjectTeacher: processMarks(subjectMarks)
    };
  }
}

module.exports = TeacherMarksService;
