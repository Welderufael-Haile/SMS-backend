const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class ApplicantsService {
  static async createApplicant(data, file) {
    const { position, fullname, sex, email, phone } = data;
    const cv = file ? file.filename : null;

    if (!position || !fullname || !sex || !email || !phone || !cv) {
      throw new BadRequestError('All fields are required.');
    }

    const existing = await prisma.job_applications.findFirst({
      where: { email }
    });

    if (existing) {
      throw new BadRequestError('This email has already been used to apply.');
    }

    return await prisma.job_applications.create({
      data: {
        position,
        fullname,
        Sex: sex,
        email,
        phone,
        cv_path: cv
      }
    });
  }

  static async getApplicants() {
    return await prisma.job_applications.findMany({
      orderBy: { submitted_at: 'desc' }
    });
  }

  static async deleteApplicant(id) {
    const applicantId = parseInt(id, 10);
    const applicant = await prisma.job_applications.findUnique({
      where: { id: applicantId }
    });

    if (!applicant) {
      throw new NotFoundError('Applicant not found.');
    }

    if (applicant.cv_path) {
      const filePath = path.join(__dirname, '../uploads/cvs', applicant.cv_path);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting CV:", err);
        });
      }
    }

    return await prisma.job_applications.delete({
      where: { id: applicantId }
    });
  }
}

module.exports = ApplicantsService;
