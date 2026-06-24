const express = require('express');
const router = express.Router();
const { registerStaff, listStaff, scanStaff } = require('../controllers/staffController');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = (io) => {
  router.get('/', authenticate, listStaff);
  router.post('/', authenticate, authorize('admin'), registerStaff);
  router.post('/scan', authenticate, authorize('scan_gate'), (req, res) => scanStaff(req, res, io));
  return router;
};
