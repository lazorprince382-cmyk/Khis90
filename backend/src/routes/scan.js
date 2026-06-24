const express = require('express');
const router = express.Router();
const { processScan, getDashboardStats, getDashboardDetails, resetDailyLunch } = require('../controllers/scanController');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = (io) => {
  router.post('/', authenticate, (req, res, next) => {
    const type = req.body.scan_type;
    const permMap = {
      gate_in: 'scan_gate', gate_out: 'scan_gate',
      lunch: 'scan_lunch', library_in: 'scan_library', library_out: 'scan_library',
    };
    const perm = permMap[type];
    const { ROLE_PERMISSIONS } = require('../middleware/auth');
    const perms = ROLE_PERMISSIONS[req.user?.role] || [];
    if (!perms.includes('*') && !perms.includes(perm)) {
      return res.status(403).json({ error: 'Insufficient permissions for this scan type.' });
    }
    return processScan(req, res, io);
  });
  router.get('/stats', authenticate, getDashboardStats);
  router.get('/details/:kind', authenticate, getDashboardDetails);
  router.post('/reset-lunch', authenticate, authorize('admin'), resetDailyLunch);
  return router;
};
