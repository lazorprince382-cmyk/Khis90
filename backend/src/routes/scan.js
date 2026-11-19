const express = require('express');
const router = express.Router();
const { processScan, getDashboardStats, getDashboardDetails, resetDailyLunch } = require('../controllers/scanController');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = (io) => {
  router.post('/', authenticate, (req, res, next) => {
    const type = req.body.scan_type;
    const permMap = {
      gate_in: 'scan_gate', gate_out: 'scan_gate',
      lunch: 'scan_lunch', meal_break: 'scan_lunch', meal_lunch: 'scan_lunch', meal_supper: 'scan_lunch',
      library_in: 'scan_library', library_out: 'scan_library',
      dormitory_in: 'scan_dormitory', dormitory_out: 'scan_dormitory',
    };
    const pathMap = {
      gate_in: '/scan/gate', gate_out: '/scan/gate',
      lunch: '/scan/lunch', meal_break: '/scan/lunch', meal_lunch: '/scan/lunch', meal_supper: '/scan/lunch',
      library_in: '/scan/library', library_out: '/scan/library',
      dormitory_in: '/scan/dormitory', dormitory_out: '/scan/dormitory',
    };
    const path = pathMap[type];
    const access = req.user?.dashboard_access || [];
    if (!access.includes('*') && !access.includes(path)) {
      return res.status(403).json({ error: 'Insufficient permissions for this scan type.' });
    }
    return processScan(req, res, io);
  });
  router.get('/stats', authenticate, getDashboardStats);
  router.get('/details/:kind', authenticate, getDashboardDetails);
  router.post('/reset-lunch', authenticate, authorize('admin'), resetDailyLunch);
  return router;
};
