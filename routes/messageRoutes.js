const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const messageController = require('../controllers/messageController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, safeName);
  }
});

const allowedMime = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav',
  'video/mp4', 'video/quicktime',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'application/zip', 'application/octet-stream'
];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMime.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

router.use((req, res, next) => {
  req.app.set('uploadDir', uploadDir);
  next();
});

router.post('/upload', verifyToken, upload.single('file'), messageController.uploadFile);
router.get('/users', verifyToken, messageController.getChatUsers);
router.get('/unread/count', verifyToken, messageController.getUnreadCount);
router.get('/unread/:senderId', verifyToken, messageController.getUnreadCountFromSender);
router.get('/:receiverId', verifyToken, messageController.getMessages);
router.post('/', verifyToken, messageController.sendMessage);
router.patch('/:messageId', verifyToken, messageController.editMessage);
router.post('/bulk-delete', verifyToken, messageController.deleteMultipleMessages);
router.delete('/:messageId', verifyToken, messageController.deleteMessage);

module.exports = router;
