const pool = require('../config/db');

function csvValue(value) {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

async function attendanceByClass(req, res) {
  const { date, class_name } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    let query = `
      SELECT l.id, l.card_id, l.first_name, l.last_name, l.class_name,
             ls.current_location, ls.lunch_today,
             (SELECT MIN(scanned_at) FROM scan_events se
              WHERE se.learner_id = l.id AND se.scan_type = 'gate_in'
              AND DATE(se.scanned_at) = $1) AS arrival_time,
             (SELECT MAX(scanned_at) FROM scan_events se
              WHERE se.learner_id = l.id AND se.scan_type = 'gate_out'
              AND DATE(se.scanned_at) = $1) AS departure_time,
             EXISTS(SELECT 1 FROM scan_events se
              WHERE se.learner_id = l.id AND se.scan_type = 'gate_in'
              AND DATE(se.scanned_at) = $1) AS present
      FROM learners l
      LEFT JOIN learner_status ls ON l.id = ls.learner_id
      WHERE l.is_active = TRUE
    `;
    const params = [targetDate];
    if (class_name) {
      query += ' AND l.class_name = $2';
      params.push(class_name);
    }
    query += ' ORDER BY l.class_name, l.last_name, l.first_name';
    const result = await pool.query(query, params);

    const summary = {};
    result.rows.forEach((r) => {
      if (!summary[r.class_name]) summary[r.class_name] = { total: 0, present: 0, absent: 0 };
      summary[r.class_name].total++;
      if (r.present) summary[r.class_name].present++;
      else summary[r.class_name].absent++;
    });

    res.json({ date: targetDate, summary, learners: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate attendance report.' });
  }
}

async function exportAttendanceCSV(req, res) {
  const { date, class_name } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    let query = `
      SELECT l.first_name, l.last_name, l.class_name, l.card_id,
             CASE WHEN EXISTS(SELECT 1 FROM scan_events se WHERE se.learner_id = l.id
               AND se.scan_type = 'gate_in' AND DATE(se.scanned_at) = $1) THEN 'Present' ELSE 'Absent' END AS status,
             (SELECT TO_CHAR(MIN(scanned_at), 'HH24:MI') FROM scan_events se
              WHERE se.learner_id = l.id AND se.scan_type = 'gate_in' AND DATE(se.scanned_at) = $1) AS arrival,
             (SELECT TO_CHAR(MAX(scanned_at), 'HH24:MI') FROM scan_events se
              WHERE se.learner_id = l.id AND se.scan_type = 'gate_out' AND DATE(se.scanned_at) = $1) AS departure,
             ls.lunch_today
      FROM learners l
      LEFT JOIN learner_status ls ON l.id = ls.learner_id
      WHERE l.is_active = TRUE
    `;
    const params = [targetDate];
    if (class_name) { query += ' AND l.class_name = $2'; params.push(class_name); }
    query += ' ORDER BY l.class_name, l.last_name';
    const result = await pool.query(query, params);

    const headers = ['First Name', 'Last Name', 'Class', 'Card ID', 'Status', 'Arrival', 'Departure', 'Lunch'];
    const rows = result.rows.map((r) =>
      [r.first_name, r.last_name, r.class_name, r.card_id, r.status, r.arrival || '', r.departure || '', r.lunch_today ? 'Yes' : 'No'].map(csvValue).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${targetDate}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
}

async function dailySummary(req, res) {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const [attendance, scans, visitors, staff] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM scan_events se WHERE se.learner_id = l.id AND se.scan_type = 'gate_in' AND DATE(se.scanned_at) = $1
          ))::int AS present
         FROM learners l WHERE l.is_active = TRUE`,
        [targetDate]
      ),
      pool.query(
        `SELECT scan_type, COUNT(*)::int AS count
         FROM scan_events WHERE DATE(scanned_at) = $1 GROUP BY scan_type ORDER BY scan_type`,
        [targetDate]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM visitors WHERE DATE(check_in_time) = $1`, [targetDate]).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT COUNT(*)::int AS count FROM staff_attendance WHERE DATE(scanned_at) = $1`, [targetDate]).catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    const att = attendance.rows[0];
    res.json({
      date: targetDate,
      learners_total: att.total,
      learners_present: att.present,
      learners_absent: att.total - att.present,
      scan_counts: scans.rows,
      visitors_today: visitors.rows[0]?.count || 0,
      staff_scans_today: staff.rows[0]?.count || 0,
    });
  } catch (err) {
    console.error('Daily summary error:', err);
    res.status(500).json({ error: 'Failed to generate daily summary.' });
  }
}

async function exportDailyActivityCSV(req, res) {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT se.scanned_at, se.scan_type, se.scanner_location, l.first_name, l.last_name, l.class_name, l.card_id
       FROM scan_events se JOIN learners l ON se.learner_id = l.id
       WHERE DATE(se.scanned_at) = $1
       ORDER BY se.scanned_at DESC`,
      [targetDate]
    );
    const headers = ['Time', 'Type', 'Location', 'First Name', 'Last Name', 'Class', 'Card ID'];
    const rows = result.rows.map((r) => [
      r.scanned_at, r.scan_type, r.scanner_location, r.first_name, r.last_name, r.class_name, r.card_id,
    ].map(csvValue).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=daily-activity-${targetDate}.csv`);
    res.send([headers.map(csvValue).join(','), ...rows].join('\n'));
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
}

async function dailyActivityReport(req, res) {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT se.*, l.first_name, l.last_name, l.class_name, l.card_id
       FROM scan_events se JOIN learners l ON se.learner_id = l.id
       WHERE DATE(se.scanned_at) = $1
       ORDER BY se.scanned_at DESC`,
      [targetDate]
    );
    res.json({ date: targetDate, events: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
}

module.exports = { attendanceByClass, exportAttendanceCSV, dailyActivityReport, dailySummary, exportDailyActivityCSV };
