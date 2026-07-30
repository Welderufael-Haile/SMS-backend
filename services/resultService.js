const prisma = require('../config/prisma');

class ResultService {
  static async getStudentResults(query) {
    const { year_id, term_id, section_id, name } = query;

    const whereEnrollment = {
      ...(year_id ? { academic_year_id: parseInt(year_id, 10) } : {}),
      ...(term_id ? { terms_id: parseInt(term_id, 10) } : {}),
      ...(section_id ? { sections_id: parseInt(section_id, 10) } : {})
    };

    const results = await prisma.marks.findMany({
      where: {
        enrollments: {
          ...whereEnrollment,
          ...(name ? { Student: { full_name: { contains: name } } } : {})
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
      }
    });

    return results.map(m => ({
      student_id: m.enrollments?.Student?.id,
      full_name: m.enrollments?.Student?.full_name,
      Sex: m.enrollments?.Student?.Sex,
      section_name: m.enrollments?.sections?.name,
      grade_level: m.enrollments?.sections?.grade_level,
      year_name: m.enrollments?.academic_year?.year_name,
      year_id: m.enrollments?.academic_year_id,
      term_name: m.enrollments?.terms?.term_name,
      term_id: m.enrollments?.terms_id,
      subject_name: m.subjects?.name,
      score: m.total_score,
      enrollment_id: m.enrollments_id
    }));
  }
}

module.exports = ResultService;
