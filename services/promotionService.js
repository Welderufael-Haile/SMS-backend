const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class PromotionService {
  static async previewPromotion(query) {
    const { academic_year_id, section_id } = query;
    if (!academic_year_id) {
      throw new BadRequestError("Academic Year ID is required");
    }

    const yearId = parseInt(academic_year_id, 10);
    const secId = section_id ? parseInt(section_id, 10) : null;

    const alreadyProcessedCount = await prisma.enrollments.count({
      where: {
        academic_year_id: yearId,
        status: { in: ['promoted', 'repeated'] },
        ...(secId ? { sections_id: secId } : {})
      }
    });

    if (alreadyProcessedCount > 0) {
      throw new BadRequestError(
        secId 
          ? "Some students in this section have already been promoted/repeated for this academic year."
          : "Some students have already been promoted/repeated for this academic year."
      );
    }

    const activeEnrollments = await prisma.enrollments.findMany({
      where: {
        academic_year_id: yearId,
        status: 'active',
        ...(secId ? { sections_id: secId } : {})
      },
      include: {
        Student: true,
        sections: true,
        terms: true,
        marks: true
      }
    });

    if (activeEnrollments.length === 0) {
      throw new NotFoundError("No active students found for promotion");
    }

    // Group by student
    const studentMap = new Map();
    activeEnrollments.forEach(e => {
      const sId = e.student_id;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          student_id: sId,
          full_name: e.Student.full_name,
          grade_level: e.sections.grade_level,
          section_name: e.sections.name,
          section_id: e.sections.id,
          terms: []
        });
      }
      const s = studentMap.get(sId);
      const scores = e.marks.map(m => parseFloat(m.total_score)).filter(score => !isNaN(score));
      const termAvg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      s.terms.push({ term_name: e.terms.term_name, avg: termAvg });
    });

    const preview = [];
    studentMap.forEach(s => {
      const termsCompleted = s.terms.length;
      const totalAvg = termsCompleted > 0 ? (s.terms.reduce((a, b) => a + b.avg, 0) / termsCompleted) : 0;
      const isGrade12 = s.grade_level === 12;

      let decision = 'PENDING';
      let decisionReason = '';
      let canPromote = false;

      const PASSING_GRADE = parseFloat(process.env.PASSING_GRADE) || 50;

      if (isGrade12) {
        decision = 'COMPLETED';
        decisionReason = `Grade 12 completed - awaits national exam (Avg: ${totalAvg.toFixed(2)}%)`;
        canPromote = false;
      } else if (termsCompleted === 0) {
        decision = 'INCOMPLETE';
        decisionReason = 'No terms completed';
        canPromote = false;
      } else {
        canPromote = totalAvg >= PASSING_GRADE;
        decision = canPromote ? 'PROMOTE' : 'REPEAT';
        decisionReason = `Based on ${termsCompleted} terms - ${canPromote ? 'promote' : 'repeat'}`;
      }

      preview.push({
        student_id: s.student_id,
        full_name: s.full_name,
        grade_level: s.grade_level,
        section_name: s.section_name,
        terms_completed: termsCompleted,
        term_breakdown: s.terms.map(t => `${t.term_name}:${t.avg.toFixed(2)}`).join(' | '),
        average: totalAvg.toFixed(2),
        decision,
        reason: decisionReason,
        can_promote: canPromote,
        is_grade12: isGrade12
      });
    });

    const stats = {
      total: preview.length,
      promote: preview.filter(p => p.decision.includes('PROMOTE')).length,
      repeat: preview.filter(p => p.decision.includes('REPEAT')).length,
      complete: preview.filter(p => p.decision === 'COMPLETED').length,
      incomplete: preview.filter(p => p.decision === 'INCOMPLETE').length,
      grade12: preview.filter(p => p.is_grade12).length
    };

    return { stats, data: preview };
  }

  static async confirmPromotion(body) {
    const { academic_year_id, next_academic_year_id, next_term_id, section_id } = body;
    if (!academic_year_id || !next_academic_year_id || !next_term_id) {
      throw new BadRequestError("Current academic year, next academic year, and next term are required.");
    }

    const yearId = parseInt(academic_year_id, 10);
    const nextYearId = parseInt(next_academic_year_id, 10);
    const nextTermId = parseInt(next_term_id, 10);
    const secId = section_id ? parseInt(section_id, 10) : null;

    return await prisma.$transaction(async (tx) => {
      // Pre-fetch sections for round-robin assignment
      const allSections = await tx.sections.findMany({ where: { status: 'active' } });
      const sectionsByGrade = {};
      allSections.forEach(sec => {
        if (!sectionsByGrade[sec.grade_level]) sectionsByGrade[sec.grade_level] = [];
        sectionsByGrade[sec.grade_level].push(sec);
      });
      const gradeSectionCounters = {};

      const activeEnrollments = await tx.enrollments.findMany({
        where: {
          academic_year_id: yearId,
          status: 'active',
          ...(secId ? { sections_id: secId } : {})
        },
        include: {
          Student: true,
          sections: true,
          marks: true
        }
      });

      if (activeEnrollments.length === 0) {
        throw new NotFoundError("No active students found for promotion");
      }

      // Group enrollments per student
      const studentMap = new Map();
      activeEnrollments.forEach(e => {
        const sId = e.student_id;
        if (!studentMap.has(sId)) {
          studentMap.set(sId, {
            student: e.Student,
            section: e.sections,
            enrollments: []
          });
        }
        studentMap.get(sId).enrollments.push(e);
      });

      let promotedCount = 0;
      let repeatedCount = 0;
      let completedCount = 0;
      const details = [];

      for (const [studentId, data] of studentMap.entries()) {
        const { student, section, enrollments } = data;
        const allScores = enrollments.flatMap(e => e.marks.map(m => parseFloat(m.total_score)).filter(s => !isNaN(s)));
        const yearlyAvg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
        const isGrade12 = section.grade_level === 12;

        let finalStatus;
        let decisionNote;
        let nextGrade = section.grade_level;

        if (isGrade12) {
          finalStatus = 'completed';
          decisionNote = `Grade 12 completed - awaiting national exam (Avg: ${yearlyAvg.toFixed(2)}%)`;
          completedCount++;

          await tx.graduation_records.create({
            data: {
              student_id: studentId,
              graduation_date: new Date(),
              final_average: yearlyAvg,
              academic_year_id: yearId,
              terms_completed: enrollments.length
            }
          });
        } else {
          const PASSING_GRADE = parseFloat(process.env.PASSING_GRADE) || 50;
          const isPromoted = yearlyAvg >= PASSING_GRADE;
          finalStatus = isPromoted ? 'promoted' : 'repeated';
          decisionNote = `Based on ${enrollments.length} terms`;
          
          let targetSectionId = null;

          if (isPromoted) {
            promotedCount++;
            nextGrade = section.grade_level + 1;
            
            // Round-robin section assignment for promoted students
            const availableSections = sectionsByGrade[nextGrade] || [];
            if (availableSections.length > 0) {
              if (gradeSectionCounters[nextGrade] === undefined) gradeSectionCounters[nextGrade] = 0;
              targetSectionId = availableSections[gradeSectionCounters[nextGrade] % availableSections.length].id;
              gradeSectionCounters[nextGrade]++;
            }
          } else {
            repeatedCount++;
            // Repeaters stay in their exact same section
            targetSectionId = section.id;
          }

          if (targetSectionId) {
            await tx.enrollments.create({
              data: {
                student_id: studentId,
                academic_year_id: nextYearId,
                terms_id: nextTermId,
                sections_id: targetSectionId,
                status: 'active',
                promotion_note: `From grade ${section.grade_level}: ${finalStatus}`
              }
            });
          }
        }

        // Update active enrollments
        for (const e of enrollments) {
          await tx.enrollments.update({
            where: { id: e.id },
            data: {
              status: finalStatus,
              final_average: yearlyAvg,
              completed_at: new Date(),
              promotion_note: decisionNote
            }
          });
        }

        details.push({
          student_id: studentId,
          name: student.full_name,
          from_grade: section.grade_level,
          to_grade: isGrade12 ? section.grade_level : nextGrade,
          average: yearlyAvg.toFixed(2),
          decision: finalStatus
        });
      }

      return {
        stats: {
          total: studentMap.size,
          promoted: promotedCount,
          repeated: repeatedCount,
          completed: completedCount
        },
        details
      };
    });
  }

  static async getPromotionEligibility(academic_year_id) {
    if (!academic_year_id) {
      throw new BadRequestError("Academic Year ID required");
    }

    const yearId = parseInt(academic_year_id, 10);
    const totalStudents = await prisma.enrollments.count({
      where: { academic_year_id: yearId, status: 'active' }
    });

    return {
      total: totalStudents,
      can_proceed: totalStudents > 0
    };
  }
}

module.exports = PromotionService;
