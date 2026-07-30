const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class AnnouncementService {
  static async getAnnouncements(query) {
    const { category, priority, target, pinned, showExpired } = query;

    const where = {};

    if (!showExpired) {
      where.OR = [
        { expiry_date: null },
        { expiry_date: { gte: new Date() } }
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (target && target !== 'all') {
      where.OR = [
        { target_audience: 'all' },
        { target_audience: target }
      ];
    }

    if (pinned === 'true') {
      where.is_pinned = true;
    }

    return await prisma.announcements.findMany({
      where,
      orderBy: [
        { is_pinned: 'desc' },
        { post_time: 'desc' }
      ]
    });
  }

  static async createAnnouncement(data) {
    const { title, subtitle, description, category, priority, target_audience, is_pinned, expiry_date } = data;

    if (!title || title.trim() === '') throw new BadRequestError("Title is required");
    if (!description || description.trim() === '') throw new BadRequestError("Description is required");

    let formattedExpiryDate = null;
    if (expiry_date && expiry_date.trim() !== '') {
      const date = new Date(expiry_date);
      if (!isNaN(date.getTime())) formattedExpiryDate = date;
    }

    return await prisma.announcements.create({
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        description: description.trim(),
        category: category || 'general',
        priority: priority || 'medium',
        target_audience: target_audience || 'all',
        is_pinned: is_pinned === true || is_pinned === 'true',
        expiry_date: formattedExpiryDate
      }
    });
  }

  static async getAnnouncementById(id) {
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) throw new BadRequestError("Invalid announcement ID");

    const announcement = await prisma.announcements.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) {
      throw new NotFoundError("Announcement not found");
    }

    // Increment views
    return await prisma.announcements.update({
      where: { id: announcementId },
      data: { views: { increment: 1 } }
    });
  }

  static async updateAnnouncement(id, data) {
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) throw new BadRequestError("Invalid announcement ID");

    const { title, subtitle, description, category, priority, target_audience, is_pinned, expiry_date } = data;

    if (!title || title.trim() === '') throw new BadRequestError("Title is required");
    if (!description || description.trim() === '') throw new BadRequestError("Description is required");

    let formattedExpiryDate = null;
    if (expiry_date && expiry_date.trim() !== '') {
      const date = new Date(expiry_date);
      if (!isNaN(date.getTime())) formattedExpiryDate = date;
    }

    try {
      return await prisma.announcements.update({
        where: { id: announcementId },
        data: {
          title: title.trim(),
          subtitle: subtitle?.trim() || null,
          description: description.trim(),
          category: category || 'general',
          priority: priority || 'medium',
          target_audience: target_audience || 'all',
          is_pinned: is_pinned === true || is_pinned === 'true',
          expiry_date: formattedExpiryDate
        }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Announcement not found");
      }
      throw err;
    }
  }

  static async deleteAnnouncement(id) {
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) throw new BadRequestError("Invalid announcement ID");

    try {
      return await prisma.announcements.delete({
        where: { id: announcementId }
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundError("Announcement not found");
      }
      throw err;
    }
  }

  static async togglePin(id) {
    const announcementId = parseInt(id, 10);
    if (isNaN(announcementId)) throw new BadRequestError("Invalid announcement ID");

    const current = await prisma.announcements.findUnique({
      where: { id: announcementId },
      select: { is_pinned: true }
    });

    if (!current) {
      throw new NotFoundError("Announcement not found");
    }

    const newPinState = !current.is_pinned;

    await prisma.announcements.update({
      where: { id: announcementId },
      data: { is_pinned: newPinState }
    });

    return newPinState;
  }

  static async getAnnouncementStats() {
    const all = await prisma.announcements.findMany({
      where: {
        OR: [
          { expiry_date: null },
          { expiry_date: { gte: new Date() } }
        ]
      }
    });

    const total = all.length;
    const pinned = all.filter(a => a.is_pinned).length;
    const general = all.filter(a => a.category === 'general').length;
    const academic = all.filter(a => a.category === 'academic').length;
    const events = all.filter(a => a.category === 'event').length;
    const holiday = all.filter(a => a.category === 'holiday').length;
    const emergency = all.filter(a => a.category === 'emergency').length;
    const total_views = all.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const avg_views = total > 0 ? (total_views / total) : 0;

    return {
      total,
      pinned,
      general,
      academic,
      events,
      holiday,
      emergency,
      total_views,
      avg_views
    };
  }
}

module.exports = AnnouncementService;
