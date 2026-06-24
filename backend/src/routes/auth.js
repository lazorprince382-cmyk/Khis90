const express = require('express');
const router = express.Router();
const { login, getMe, createUser, updateUser, deleteUser, listUsers, changePassword, resetPassword } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.get('/users', authenticate, authorize('admin'), listUsers);
router.post('/users', authenticate, authorize('admin'), createUser);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.post('/users/:id/reset-password', authenticate, authorize('admin'), resetPassword);

module.exports = router;
