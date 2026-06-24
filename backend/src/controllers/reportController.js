const pool = require('../config/db');

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
      [r.first_name, r.last_name, r.class_name, r.card_id, r.status, r.arrival || '', r.departure || '', r.lunch_today ? 'Yes' : 'No'].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${targetDate}.csv`);
    res.send(csv);
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

module.exports = { attendanceByClass, exportAttendanceCSV, dailyActivityReport };
