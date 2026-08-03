const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

const getChatUsers = async (currentUserId) => {
  return await prisma.users.findMany({
    where: {
      id: { not: currentUserId },
      status: 'active',
    },
    select: {
      id: true,
      full_name: true,
      role: true,
      last_login: true,
    },
    orderBy: { full_name: 'asc' },
  });
};

const getMessages = async (currentUserId, receiverId, skip, limit) => {
  const messagesList = await prisma.messages.findMany({
    where: {
      isDeleted: false,
      OR: [
        { senderId: currentUserId, receiverId, deletedBySender: false },
        { senderId: receiverId, receiverId: currentUserId, deletedByReceiver: false },
      ],
    },
    include: {
      sender: { select: { id: true, full_name: true, role: true } },
      receiver: { select: { id: true, full_name: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  // Mark as read
  await prisma.messages.updateMany({
    where: {
      senderId: receiverId,
      receiverId: currentUserId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return messagesList.reverse();
};

const sendMessage = async (currentUserId, rId, content, file) => {
  const messageData = {
    content: content || '',
    senderId: currentUserId,
    receiverId: rId,
  };

  if (file && file.url) {
    messageData.fileUrl = file.url;
    messageData.fileType = file.type || (file.url?.includes('/uploads/') && file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'file');
    messageData.fileName = file.name;
  }

  return await prisma.messages.create({
    data: messageData,
    include: {
      sender: { select: { id: true, full_name: true, role: true } },
      receiver: { select: { id: true, full_name: true, role: true } }
    }
  });
};

const editMessage = async (messageId, currentUserId, newContent) => {
  const msg = await prisma.messages.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error('Message not found');
  if (msg.senderId !== currentUserId) throw new Error('Forbidden');

  return await prisma.messages.update({
    where: { id: messageId },
    data: { content: newContent }
  });
};

const deleteMessage = async (messageId, currentUserId, uploadDir, deleteType = 'me') => {
  const msg = await prisma.messages.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error('Message not found');

  if (deleteType === 'everyone') {
    if (msg.senderId !== currentUserId) throw new Error('Forbidden: Only the sender can delete for everyone');

    if (msg.fileUrl) {
      const parts = msg.fileUrl.split('/');
      const filename = parts[parts.length - 1];
      const filePath = path.join(uploadDir, filename);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fsErr) {
        console.error('Error deleting file from disk:', fsErr);
      }
    }

    return await prisma.messages.update({ 
      where: { id: messageId },
      data: { isDeleted: true }
    });
  } else {
    // deleteType === 'me'
    if (msg.senderId === currentUserId) {
      return await prisma.messages.update({
        where: { id: messageId },
        data: { deletedBySender: true }
      });
    } else if (msg.receiverId === currentUserId) {
      return await prisma.messages.update({
        where: { id: messageId },
        data: { deletedByReceiver: true }
      });
    } else {
      throw new Error('Forbidden');
    }
  }
};

const deleteMultipleMessages = async (messageIds, currentUserId, uploadDir, deleteType = 'me') => {
  // Find all messages that belong to the user (either sender or receiver)
  const msgs = await prisma.messages.findMany({
    where: { 
      id: { in: messageIds },
      OR: [
        { senderId: currentUserId },
        { receiverId: currentUserId }
      ]
    }
  });

  const idsToDelete = msgs.map(m => m.id);
  
  if (idsToDelete.length === 0) return { count: 0 };

  if (deleteType === 'everyone') {
    // Only allow if ALL messages were sent by the user
    const allSentByMe = msgs.every(m => m.senderId === currentUserId);
    if (!allSentByMe) {
      throw new Error('You can only delete messages for everyone if you sent all of them');
    }

    // Delete files
    for (const msg of msgs) {
      if (msg.fileUrl) {
        const parts = msg.fileUrl.split('/');
        const filename = parts[parts.length - 1];
        const filePath = path.join(uploadDir, filename);

        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fsErr) {
          console.error('Error deleting file from disk:', fsErr);
        }
      }
    }

    return await prisma.messages.updateMany({
      where: { id: { in: idsToDelete } },
      data: { isDeleted: true }
    });
  } else {
    // deleteType === 'me'
    const sentIds = msgs.filter(m => m.senderId === currentUserId).map(m => m.id);
    const receivedIds = msgs.filter(m => m.receiverId === currentUserId).map(m => m.id);

    let count = 0;
    if (sentIds.length > 0) {
      const res = await prisma.messages.updateMany({
        where: { id: { in: sentIds } },
        data: { deletedBySender: true }
      });
      count += res.count;
    }
    if (receivedIds.length > 0) {
      const res = await prisma.messages.updateMany({
        where: { id: { in: receivedIds } },
        data: { deletedByReceiver: true }
      });
      count += res.count;
    }
    return { count };
  }
};

const getUnreadCount = async (currentUserId) => {
  return await prisma.messages.count({
    where: {
      receiverId: currentUserId,
      isRead: false,
    },
  });
};

const getUnreadCountFromSender = async (currentUserId, senderId) => {
  return await prisma.messages.count({
    where: {
      senderId,
      receiverId: currentUserId,
      isRead: false,
    },
  });
};

module.exports = {
  getChatUsers,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  deleteMultipleMessages,
  getUnreadCount,
  getUnreadCountFromSender
};
