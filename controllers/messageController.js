const messageService = require('../services/messageService');
const prisma = require('../config/prisma');

const getChatUsers = async (req, res) => {
  try {
    const users = await messageService.getChatUsers(req.user.id);
    res.json({ users });
  } catch (error) {
    console.error('Get users for chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const receiverId = parseInt(req.params.receiverId, 10);
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await messageService.getMessages(req.user.id, receiverId, skip, parseInt(limit));
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, receiverId, file } = req.body;
    const rId = parseInt(receiverId, 10);

    const receiver = await prisma.users.findUnique({
      where: { id: rId },
      select: { id: true, status: true },
    });

    if (!receiver || receiver.status !== 'active') {
      return res.status(400).json({ error: 'Invalid receiver' });
    }

    const message = await messageService.sendMessage(req.user.id, rId, content, file);

    const io = req.app.get('socketio');
    if (io) {
      io.to(`user_${rId}`).emit('new_message', message);
      io.to(`user_${req.user.id}`).emit('message_sent', message);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const editMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const { newContent } = req.body;

    const updated = await messageService.editMessage(messageId, req.user.id, newContent);

    const io = req.app.get('socketio');
    if (io) {
      io.to(`user_${updated.senderId}`).emit('message_edited', updated);
      io.to(`user_${updated.receiverId}`).emit('message_edited', updated);
    }

    res.json({ message: 'Message edited', data: updated });
  } catch (error) {
    console.error('Edit message error:', error);
    if (error.message === 'Message not found') return res.status(404).json({ error: 'Message not found' });
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const deleteType = req.query.type || 'me';
    const uploadDir = req.app.get('uploadDir');

    const deleted = await messageService.deleteMessage(messageId, req.user.id, uploadDir, deleteType);

    const io = req.app.get('socketio');
    if (io) {
      if (deleteType === 'everyone') {
        io.to(`user_${deleted.senderId}`).emit('message_deleted', { messageId, deleteType });
        io.to(`user_${deleted.receiverId}`).emit('message_deleted', { messageId, deleteType });
        if (deleted.fileUrl) {
          io.to(`user_${deleted.senderId}`).emit('file_deleted', { messageId });
          io.to(`user_${deleted.receiverId}`).emit('file_deleted', { messageId });
        }
      } else {
        // Only notify the user who deleted it (for multi-tab support)
        io.to(`user_${req.user.id}`).emit('message_deleted', { messageId, deleteType });
      }
    }

    res.json({ message: 'Message permanently deleted', data: deleted });
  } catch (error) {
    console.error('Delete message error:', error.message);
    if (error.message === 'Message not found') return res.status(404).json({ error: 'Message not found' });
    if (error.message.includes('Forbidden')) return res.status(403).json({ error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteMultipleMessages = async (req, res) => {
  try {
    const { messageIds, type } = req.body;
    const deleteType = type || 'me';
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    const uploadDir = req.app.get('uploadDir') || require('path').join(__dirname, '..', 'uploads');
    const result = await messageService.deleteMultipleMessages(messageIds, req.user.id, uploadDir, deleteType);

    const io = req.app.get('socketio');
    if (io) {
      messageIds.forEach(id => {
        if (deleteType === 'everyone') {
          io.emit('message_deleted', { messageId: id, deleteType });
        } else {
          io.to(`user_${req.user.id}`).emit('message_deleted', { messageId: id, deleteType });
        }
      });
    }

    res.json({ message: 'Messages deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error.message);
    if (error.message.includes('You can only delete messages for everyone if you sent all of them')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await messageService.getUnreadCount(req.user.id);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUnreadCountFromSender = async (req, res) => {
  try {
    const senderId = parseInt(req.params.senderId, 10);
    const count = await messageService.getUnreadCountFromSender(req.user.id, senderId);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get per-user unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const urlPath = `/uploads/${req.file.filename}`;
    let fileType = 'file';
    if (req.file.mimetype.startsWith('image/')) fileType = 'image';
    else if (req.file.mimetype.startsWith('audio/')) fileType = 'audio';

    res.json({
      url: urlPath,
      name: req.file.originalname,
      type: fileType,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
}

module.exports = {
  getChatUsers,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  deleteMultipleMessages,
  getUnreadCount,
  getUnreadCountFromSender,
  uploadFile
};
