const prisma = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

class JobPostsService {
  static async getJobPosts() {
    return await prisma.job_posts.findMany({
      orderBy: { post_time: 'desc' }
    });
  }

  static async createJobPost(data) {
    const { title, position, description, deadline } = data;
    return await prisma.job_posts.create({
      data: {
        title,
        position,
        description,
        deadline: new Date(deadline)
      }
    });
  }

  static async updateJobPost(id, data) {
    const jobId = parseInt(id, 10);
    const { title, position, description, deadline } = data;

    try {
      return await prisma.job_posts.update({
        where: { id: jobId },
        data: {
          ...(title && { title }),
          ...(position && { position }),
          ...(description && { description }),
          ...(deadline && { deadline: new Date(deadline) })
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Job post not found");
      }
      throw err;
    }
  }

  static async deleteJobPost(id) {
    const jobId = parseInt(id, 10);
    try {
      return await prisma.job_posts.delete({
        where: { id: jobId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Job post not found");
      }
      throw err;
    }
  }
}

module.exports = JobPostsService;
