const prisma = require('../config/prisma');

class ReportCardService {
  static async getReportCardData(query) {
    const { year_id, section_id, term_id, name } = query;

    const whereEnrollment = {
      ...(year_id ? { academic_year_id: parseInt(year_id, 10) } : {}),
      ...(section_id ? { sections_id: parseInt(section_id, 10) } : {}),
      ...(term_id ? { terms_id: parseInt(term_id, 10) } : {})
    };

    const whereMarks = {
      enrollments: {
        ...whereEnrollment,
        ...(name ? { Student: { full_name: { contains: name } } } : {})
      }
    };

    const records = await prisma.marks.findMany({
      where: whereMarks,
      include: {
        subjects: true,
        enrollments: {
          include: {
            Student: true,
            sections: true,
            terms: true
          }
        }
      },
      orderBy: [
        { enrollments: { Student: { full_name: 'asc' } } },
        { subjects: { name: 'asc' } }
      ]
    });

    return records.map(m => {
      const dob = m.enrollments?.Student?.Date_of_birth;
      let age = '-';
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
      }

      const score = (parseFloat(m.st1) || 0) +
                    (parseFloat(m.ws) || 0) +
                    (parseFloat(m.mid_exam) || 0) +
                    (parseFloat(m.project) || 0) +
                    (parseFloat(m.st2) || 0) +
                    (parseFloat(m.home_class_work) || 0) +
                    (parseFloat(m.class_activity) || 0) +
                    (parseFloat(m.final_exam) || 0);

      return {
        student_id: m.enrollments?.Student?.id,
        full_name: m.enrollments?.Student?.full_name,
        Sex: m.enrollments?.Student?.Sex,
        Date_of_birth: dob,
        age,
        section_name: m.enrollments?.sections?.name,
        grade: m.enrollments?.sections?.grade_level,
        subject_name: m.subjects?.name,
        term_name: m.enrollments?.terms?.term_name,
        score
      };
    });
  }
}

module.exports = ReportCardService;
