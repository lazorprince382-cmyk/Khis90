const express = require('express');
const router = express.Router();
const { attendanceByClass, exportAttendanceCSV, dailyActivityReport, dailySummary, exportDailyActivityCSV } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/attendance', authenticate, attendanceByClass);
router.get('/attendance/export', authenticate, exportAttendanceCSV);
router.get('/daily-activity', authenticate, dailyActivityReport);
router.get('/daily-summary', authenticate, dailySummary);
router.get('/daily-activity/export', authenticate, exportDailyActivityCSV);

module.exports = router;
