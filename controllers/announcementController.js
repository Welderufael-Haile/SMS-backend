const AnnouncementService = require('../services/announcementService');

exports.getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await AnnouncementService.getAnnouncements(req.query);
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const newAnnouncement = await AnnouncementService.createAnnouncement(req.body);

    // Socket.io emit
    try {
      const io = req.app.get('socketio');
      if (io) {
        const announcementData = {
          id: newAnnouncement.id,
          title: newAnnouncement.title,
          category: newAnnouncement.category,
          priority: newAnnouncement.priority,
          target_audience: newAnnouncement.target_audience,
          timestamp: new Date().toISOString()
        };

        if (newAnnouncement.target_audience === 'all' || newAnnouncement.target_audience === 'everyone') {
          io.emit('new_announcement', announcementData);
        } else {
          io.to(newAnnouncement.target_audience).emit('new_announcement', announcementData);
        }
      }
    } catch (socketErr) {
      console.error("Socket emit error (non-critical):", socketErr);
    }

    res.status(201).json({
      message: "Announcement created successfully",
      id: newAnnouncement.id
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await AnnouncementService.getAnnouncementById(req.params.id);

    try {
      const io = req.app.get('socketio');
      if (io) {
        io.to('admin').to('teacher').emit('view_updated', {
          id: announcement.id,
          newViews: announcement.views
        });
      }
    } catch (socketErr) {
      console.error("Socket emit error (non-critical):", socketErr);
    }

    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    await AnnouncementService.updateAnnouncement(req.params.id, req.body);
    res.status(200).json({ message: "Announcement updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    await AnnouncementService.deleteAnnouncement(req.params.id);
    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.togglePin = async (req, res, next) => {
  try {
    const newPinState = await AnnouncementService.togglePin(req.params.id);
    res.status(200).json({
      message: newPinState ? "Announcement pinned" : "Announcement unpinned",
      is_pinned: newPinState
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnnouncementStats = async (req, res, next) => {
  try {
    const stats = await AnnouncementService.getAnnouncementStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};