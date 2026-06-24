const express = require('express');
const router = express.Router();
const { login, getMe, createUser, listUsers } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorize('admin'), listUsers);
router.post('/users', authenticate, authorize('admin'), createUser);

module.exports = router;
