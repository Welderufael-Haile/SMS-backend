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

    const records = await prisma.enrollments.findMany({
      where: whereEnrollment,
      include: {
        Student: true,
        sections: true,
        terms: true,
        marks: {
          include: {
            subjects: true
          }
        }
      },
      orderBy: [
        { Student: { full_name: 'asc' } }
      ]
    });

    const formattedRecords = [];
    records.forEach(enrollment => {
      const dob = enrollment.Student?.Date_of_birth;
      let age = '-';
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
      }

      if (enrollment.marks && enrollment.marks.length > 0) {
        enrollment.marks.forEach(m => {
          const score = (parseFloat(m.st1) || 0) +
                        (parseFloat(m.ws) || 0) +
                        (parseFloat(m.mid_exam) || 0) +
                        (parseFloat(m.project) || 0) +
                        (parseFloat(m.st2) || 0) +
                        (parseFloat(m.home_class_work) || 0) +
                        (parseFloat(m.class_activity) || 0) +
                        (parseFloat(m.final_exam) || 0);

          formattedRecords.push({
            student_id: enrollment.Student?.id,
            full_name: enrollment.Student?.full_name,
            Sex: enrollment.Student?.Sex,
            Date_of_birth: dob,
            age,
            section_name: enrollment.sections?.name,
            grade: enrollment.sections?.grade_level,
            subject_name: m.subjects?.name,
            term_name: enrollment.terms?.term_name,
            score
          });
        });
      } else {
        // Include student even if they have no marks, so they are part of rank
        formattedRecords.push({
          student_id: enrollment.Student?.id,
          full_name: enrollment.Student?.full_name,
          Sex: enrollment.Student?.Sex,
          Date_of_birth: dob,
          age,
          section_name: enrollment.sections?.name,
          grade: enrollment.sections?.grade_level,
          subject_name: null,
          term_name: enrollment.terms?.term_name,
          score: 0
        });
      }
    });

    return formattedRecords;

    // (Removed mapping logic since it was moved above)
  }
}

module.exports = ReportCardService;
