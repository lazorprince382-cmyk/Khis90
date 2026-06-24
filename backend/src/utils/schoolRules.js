const pool = require('../config/db');

async function getSettings() {
  const result = await pool.query('SELECT * FROM school_settings WHERE id = 1');
  return result.rows[0] || {
    late_arrival_time: '08:00:00',
    early_departure_time: '14:00:00',
    scan_cooldown_seconds: 30,
    school_open_time: '07:00:00',
    school_close_time: '17:00:00',
  };
}

async function isHolidayToday() {
  const result = await pool.query(
    `SELECT * FROM holidays WHERE holiday_date = CURRENT_DATE AND is_closed = TRUE`
  );
  return result.rows[0] || null;
}

async function isWeekend() {
  const result = await pool.query(`SELECT EXTRACT(DOW FROM CURRENT_DATE) AS dow`);
  const dow = parseInt(result.rows[0].dow);
  return dow === 0 || dow === 6;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

async function checkDuplicateScan(learnerId, scanType, cooldownSeconds) {
  const result = await pool.query(
    `SELECT scanned_at FROM scan_events
     WHERE learner_id = $1 AND scan_type = $2
     ORDER BY scanned_at DESC LIMIT 1`,
    [learnerId, scanType]
  );
  if (result.rows.length === 0) return null;
  const lastScan = new Date(result.rows[0].scanned_at);
  const diff = (Date.now() - lastScan.getTime()) / 1000;
  if (diff < cooldownSeconds) {
    return Math.ceil(cooldownSeconds - diff);
  }
  return null;
}

function checkLateArrival(settings) {
  const lateMin = timeToMinutes(settings.late_arrival_time);
  return nowMinutes() > lateMin;
}

function checkEarlyDeparture(settings) {
  const earlyMin = timeToMinutes(settings.early_departure_time);
  return nowMinutes() < earlyMin;
}

module.exports = {
  getSettings,
  isHolidayToday,
  isWeekend,
  checkDuplicateScan,
  checkLateArrival,
  checkEarlyDeparture,
};
