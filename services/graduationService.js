const prisma = require('../config/prisma');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class GraduationService {
  static async getGraduates(query) {
    const { year, student, page = 1, limit = 25 } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(year ? { academic_year_id: parseInt(year, 10) } : {}),
      ...(student ? { Student: { full_name: { contains: student } } } : {})
    };

    const total = await prisma.graduation_records.count({ where });

    const records = await prisma.graduation_records.findMany({
      where,
      include: {
        Student: true,
        academic_year: true
      },
      orderBy: { graduation_date: 'desc' },
      skip,
      take: limitNum
    });

    // Gender breakdown stats
    const genderWhere = {
      ...(year ? { academic_year_id: parseInt(year, 10) } : {})
    };

    const allGradsForGender = await prisma.graduation_records.findMany({
      where: genderWhere,
      include: { Student: { select: { Sex: true } } }
    });

    const genderStats = { male: 0, female: 0, other: 0 };
    allGradsForGender.forEach(g => {
      if (g.Student?.Sex === 'M') genderStats.male++;
      else if (g.Student?.Sex === 'F') genderStats.female++;
      else genderStats.other++;
    });

    const data = records.map(g => ({
      ...g,
      full_name: g.Student?.full_name,
      Sex: g.Student?.Sex,
      Date_of_birth: g.Student?.Date_of_birth,
      graduation_year: g.academic_year?.year_name,
      graduation_year_num: g.graduation_date ? new Date(g.graduation_date).getFullYear() : null,
      formatted_date: g.graduation_date ? new Date(g.graduation_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
    }));

    return {
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      },
      genderStats
    };
  }

  static async getGraduateById(id) {
    const graduateId = parseInt(id, 10);
    const record = await prisma.graduation_records.findUnique({
      where: { id: graduateId },
      include: {
        Student: true,
        academic_year: true
      }
    });

    if (!record) {
      throw new NotFoundError("Graduate not found");
    }

    return {
      ...record,
      full_name: record.Student?.full_name,
      Sex: record.Student?.Sex,
      Date_of_birth: record.Student?.Date_of_birth,
      graduation_year: record.academic_year?.year_name
    };
  }

  static async generateCertificate(id) {
    const graduateId = parseInt(id, 10);
    const existing = await prisma.graduation_records.findUnique({
      where: { id: graduateId },
      include: { academic_year: true }
    });

    if (!existing) {
      throw new NotFoundError("Graduate not found");
    }

    if (existing.certificate_number) {
      return {
        certificate_number: existing.certificate_number,
        alreadyExisted: true
      };
    }

    const yearName = existing.academic_year?.year_name || new Date().getFullYear().toString();

    const count = await prisma.graduation_records.count({
      where: {
        academic_year_id: existing.academic_year_id,
        certificate_number: { not: null }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    const certNumber = `GRAD-${yearName}-${sequence}`;

    await prisma.graduation_records.update({
      where: { id: graduateId },
      data: { certificate_number: certNumber }
    });

    return {
      certificate_number: certNumber,
      alreadyExisted: false
    };
  }

  static async getGraduationStats(year) {
    const where = year ? { academic_year_id: parseInt(year, 10) } : {};

    const records = await prisma.graduation_records.findMany({
      where,
      include: {
        Student: true,
        academic_year: true
      }
    });

    const total_graduates = records.length;
    const scores = records.map(r => parseFloat(r.final_average)).filter(s => !isNaN(s));
    const average_score = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "0.00";
    const highest_score = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest_score = scores.length > 0 ? Math.min(...scores) : 0;
    const full_term_graduates = records.filter(r => r.terms_completed === 3).length;
    const transfer_graduates = records.filter(r => r.terms_completed < 3).length;

    const genderStats = { male: 0, female: 0, other: 0 };
    records.forEach(r => {
      if (r.Student?.Sex === 'M') genderStats.male++;
      else if (r.Student?.Sex === 'F') genderStats.female++;
      else genderStats.other++;
    });

    return {
      overall: {
        total_graduates,
        average_score,
        highest_score,
        lowest_score,
        full_term_graduates,
        transfer_graduates,
        ...genderStats
      }
    };
  }
}

module.exports = GraduationService;
