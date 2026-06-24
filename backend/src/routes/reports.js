const express = require('express');
const router = express.Router();
const { attendanceByClass, exportAttendanceCSV, dailyActivityReport } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/attendance', authenticate, attendanceByClass);
router.get('/attendance/export', authenticate, exportAttendanceCSV);
router.get('/daily-activity', authenticate, dailyActivityReport);

module.exports = router;
