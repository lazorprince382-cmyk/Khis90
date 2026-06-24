const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { listContacts, getConversation, sendMessage, markConversationRead } = require('../controllers/messageController');

const messageUploadDir = path.join(__dirname, '../../uploads/messages');
if (!fs.existsSync(messageUploadDir)) fs.mkdirSync(messageUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, messageUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

module.exports = (io) => {
  router.get('/contacts', authenticate, listContacts);
  router.get('/conversation/:userId', authenticate, getConversation);
  router.post('/', authenticate, upload.single('attachment'), (req, res) => sendMessage(req, res, io));
  router.patch('/conversation/:userId/read', authenticate, markConversationRead);
  return router;
};
