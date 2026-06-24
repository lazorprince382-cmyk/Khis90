const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllRead, getOffices } = require('../controllers/notificationController');

router.get('/', getNotifications);
router.get('/offices', getOffices);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllRead);

module.exports = router;
