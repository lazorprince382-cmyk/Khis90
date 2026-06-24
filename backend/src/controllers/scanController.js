const pool = require('../config/db');
const {
  getSettings, isHolidayToday, isWeekend, checkDuplicateScan, checkLateArrival, checkEarlyDeparture,
} = require('../utils/schoolRules');

const SCAN_RULES = {
  gate_in: {
    allowedFrom: ['out_of_school'],
    newLocation: 'in_school',
    message: (name) => `${name} entered the school.`,
    offices: ['Main Office', 'Security Office'],
  },
  gate_out: {
    allowedFrom: ['in_school', 'in_library', 'at_lunch'],
    newLocation: 'out_of_school',
    message: (name) => `${name} left the school.`,
    offices: ['Main Office', 'Security Office'],
  },
  lunch: {
    allowedFrom: ['in_school', 'in_library', 'at_lunch'],
    newLocation: 'in_school',
    message: (name) => `${name} has had lunch.`,
    offices: ['Cafeteria Office', 'Main Office'],
    setLunch: true,
  },
  library_in: {
    allowedFrom: ['in_school'],
    newLocation: 'in_library',
    message: (name) => `${name} entered the library.`,
    offices: ['Library Office', 'Main Office'],
  },
  library_out: {
    allowedFrom: ['in_library'],
    newLocation: 'in_school',
    message: (name) => `${name} left the library.`,
    offices: ['Library Office', 'Main Office'],
  },
};

function parseScanCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.learnerId || parsed.cardId || parsed.registrationNumber || raw).trim();
  } catch {
    return raw;
  }
}

async function processScan(req, res, io) {
  const { card_id, scan_type, scanner_location } = req.body;
  const scanCode = parseScanCode(card_id);

  if (!scanCode || !scan_type) {
    return res.status(400).json({ error: 'Card ID and scan type are required.' });
  }

  const rule = SCAN_RULES[scan_type];
  if (!rule) {
    return res.status(400).json({ error: 'Invalid scan type.' });
  }

  const settings = await getSettings();
  const holiday = await isHolidayToday();
  const weekend = await isWeekend();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const learnerResult = await client.query(
      `SELECT l.*, ls.current_location, ls.lunch_today
       FROM learners l
       JOIN learner_status ls ON l.id = ls.learner_id
       WHERE l.is_active = TRUE
         AND (
           l.id::text = $1 OR
           UPPER(l.card_id) = UPPER($1) OR
           UPPER(l.barcode_data) = UPPER($1) OR
           UPPER(COALESCE(l.registration_number, '')) = UPPER($1)
         )`,
      [scanCode]
    );

    if (learnerResult.rows.length === 0) {
      const deactivated = await client.query(
        `SELECT card_id, deactivation_reason FROM learners
         WHERE is_active = FALSE
           AND (
             id::text = $1 OR
             UPPER(card_id) = UPPER($1) OR
             UPPER(barcode_data) = UPPER($1) OR
             UPPER(COALESCE(registration_number, '')) = UPPER($1)
           )`,
        [scanCode]
      );
      await client.query('ROLLBACK');
      if (deactivated.rows.length > 0) {
        return res.status(403).json({
          success: false, status: 'denied',
          message: `Card deactivated: ${deactivated.rows[0].deactivation_reason || 'Contact the office.'}`,
        });
      }
      return res.status(404).json({
        success: false, status: 'error',
        message: 'Card not recognized. Please contact the office.',
      });
    }

    const learner = learnerResult.rows[0];
    const fullName = `${learner.first_name} ${learner.last_name}`;
    const isBoarding = learner.learner_type === 'boarding';
    const isDay = !isBoarding;

    if (weekend && isDay) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, status: 'denied', message: 'School is closed on weekends for day scholars.' });
    }
    if (holiday && isDay) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, status: 'denied', message: `School is closed today: ${holiday.name}.` });
    }

    if (scan_type === 'gate_out' && isBoarding) {
      const exeatValid = learner.exeat_authorized &&
        (!learner.exeat_authorized_until || new Date(learner.exeat_authorized_until) > new Date());
      if (!exeatValid) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false, status: 'denied',
          message: `${fullName} is a boarding scholar. Gate exit requires exeat authorization from the Boarding Office.`,
          learner: { id: learner.id, name: fullName, learner_type: 'boarding' },
        });
      }
    }

    const cooldownRemaining = await checkDuplicateScan(
      learner.id, scan_type, settings.scan_cooldown_seconds || 30
    );
    if (cooldownRemaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, status: 'denied',
        message: `Duplicate scan. Please wait ${cooldownRemaining} seconds.`,
        learner: { id: learner.id, name: fullName },
      });
    }

    if (!rule.allowedFrom.includes(learner.current_location)) {
      await client.query('ROLLBACK');
      const locationLabels = {
        out_of_school: 'outside the school', in_school: 'already in school',
        in_library: 'in the library', at_lunch: 'at lunch',
      };
      return res.status(400).json({
        success: false, status: 'denied',
        message: `${fullName} is ${locationLabels[learner.current_location]}. Cannot process ${scan_type.replace('_', ' ')}.`,
        learner: { id: learner.id, name: fullName, current_location: learner.current_location },
      });
    }

    if (scan_type === 'lunch' && learner.lunch_today) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, status: 'denied',
        message: `${fullName} has already had lunch today.`,
        learner: { id: learner.id, name: fullName },
      });
    }

    let isLate = false;
    let isEarly = false;
    let alertMessage = null;

    if (scan_type === 'gate_in' && checkLateArrival(settings)) {
      isLate = true;
      alertMessage = `${fullName} arrived late (after ${settings.late_arrival_time}).`;
    }
    if (scan_type === 'gate_out' && isDay && checkEarlyDeparture(settings)) {
      isEarly = true;
      alertMessage = `${fullName} (day scholar) left early (before ${settings.early_departure_time}).`;
    }

    if (scan_type === 'gate_out' && isBoarding) {
      await client.query(
        `UPDATE learners SET exeat_authorized = FALSE, exeat_reason = NULL, exeat_authorized_until = NULL WHERE id = $1`,
        [learner.id]
      );
      await client.query(
        `UPDATE exeat_log SET used_at = CURRENT_TIMESTAMP WHERE learner_id = $1 AND used_at IS NULL AND revoked = FALSE`,
        [learner.id]
      );
    }

    await client.query(
      `INSERT INTO scan_events (learner_id, scan_type, scanner_location, is_late_arrival, is_early_departure, alert_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [learner.id, scan_type, scanner_location || null, isLate, isEarly, alertMessage]
    );

    let statusUpdate = `UPDATE learner_status SET current_location = $1, last_scan_at = CURRENT_TIMESTAMP`;
    if (rule.setLunch) statusUpdate += `, lunch_today = TRUE`;
    statusUpdate += ` WHERE learner_id = $2`;
    await client.query(statusUpdate, [rule.newLocation, learner.id]);

    let notificationMessage = rule.message(fullName);
    if (alertMessage) notificationMessage = alertMessage;
    if (scan_type === 'gate_out' && isBoarding) {
      notificationMessage = `${fullName} (boarding) exited on authorized exeat.`;
    }

    const officeNames = [...rule.offices];
    if (isBoarding) officeNames.push('Boarding Office');
    if (isDay) officeNames.push('Day Scholars Office');

    const officeResult = await client.query(
      `SELECT DISTINCT id, name FROM offices WHERE name = ANY($1) AND is_active = TRUE`,
      [officeNames]
    );

    const notifications = [];
    for (const office of officeResult.rows) {
      const notifResult = await client.query(
        `INSERT INTO notifications (office_id, learner_id, message, event_type)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [office.id, learner.id, notificationMessage, isLate ? 'late_arrival' : isEarly ? 'early_departure' : scan_type]
      );
      notifications.push({ ...notifResult.rows[0], office_name: office.name });
    }

    await client.query('COMMIT');

    const response = {
      success: true,
      status: 'approved',
      message: notificationMessage,
      alert: alertMessage,
      is_late: isLate,
      is_early: isEarly,
      learner: {
        id: learner.id, card_id: learner.card_id, name: fullName,
        class_name: learner.class_name, photo_url: learner.photo_url,
        learner_type: learner.learner_type, section: learner.section,
        boarding_house: learner.boarding_house,
        previous_location: learner.current_location,
        current_location: rule.newLocation,
        lunch_today: rule.setLunch ? true : learner.lunch_today,
      },
      scanned_at: new Date().toISOString(),
    };

    if (io) {
      io.emit('scan_event', response);
      io.emit('notification', { notifications, scan_type, learner: response.learner });
    }

    res.json(response);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Scan error:', err);
    res.status(500).json({ success: false, status: 'error', message: 'Scan processing failed.' });
  } finally {
    client.release();
  }
}

async function getDashboardStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ls.current_location = 'in_school') AS in_school,
        COUNT(*) FILTER (WHERE ls.current_location = 'in_library') AS in_library,
        COUNT(*) FILTER (WHERE ls.current_location = 'out_of_school') AS out_of_school,
        COUNT(*) FILTER (WHERE ls.lunch_today = TRUE) AS lunch_today,
        (SELECT COUNT(*) FROM scan_events WHERE scanned_at >= CURRENT_DATE AND scanned_at < CURRENT_DATE + INTERVAL '1 day') AS scans_today,
        (SELECT COUNT(*) FROM staff_members WHERE is_in_school = TRUE AND is_active = TRUE) AS staff_in_school,
        (SELECT COUNT(*) FROM visitors WHERE check_out_at IS NULL AND check_in_at >= CURRENT_DATE AND check_in_at < CURRENT_DATE + INTERVAL '1 day') AS visitors_today
      FROM learner_status ls
    `);
    const row = result.rows[0] || {};
    res.json({
      in_school: parseInt(row.in_school || 0),
      in_library: parseInt(row.in_library || 0),
      out_of_school: parseInt(row.out_of_school || 0),
      lunch_today: parseInt(row.lunch_today || 0),
      scans_today: parseInt(row.scans_today || 0),
      staff_in_school: parseInt(row.staff_in_school || 0),
      visitors_today: parseInt(row.visitors_today || 0),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

async function getDashboardDetails(req, res) {
  const { kind } = req.params;

  const learnerListQuery = `
    SELECT l.id, l.card_id, l.first_name, l.last_name, l.class_name, l.section,
           l.learner_type, l.registration_number, l.photo_url,
           ls.current_location, ls.last_scan_at, ls.lunch_today
    FROM learner_status ls
    JOIN learners l ON l.id = ls.learner_id
    WHERE ls.current_location = $1 AND l.is_active = TRUE
    ORDER BY l.class_name, l.last_name, l.first_name
  `;

  try {
    if (['in_school', 'in_library', 'out_of_school'].includes(kind)) {
      const result = await pool.query(learnerListQuery, [kind]);
      return res.json({ kind, rows: result.rows });
    }

    if (kind === 'lunch_today') {
      const result = await pool.query(
        `SELECT DISTINCT ON (l.id)
            l.id, l.card_id, l.first_name, l.last_name, l.class_name, l.section,
            l.learner_type, l.registration_number, l.photo_url,
            se.scanned_at AS lunch_at, se.scanner_location
         FROM scan_events se
         JOIN learners l ON l.id = se.learner_id
         WHERE se.scan_type = 'lunch' AND DATE(se.scanned_at) = CURRENT_DATE
         ORDER BY l.id, se.scanned_at DESC`
      );
      return res.json({ kind, rows: result.rows });
    }

    if (kind === 'library_sessions') {
      const result = await pool.query(
        `SELECT
            in_event.id AS session_id,
            l.id AS learner_id,
            l.card_id,
            l.first_name,
            l.last_name,
            l.class_name,
            l.section,
            l.learner_type,
            l.registration_number,
            l.photo_url,
            in_event.scanned_at AS entered_at,
            out_event.scanned_at AS exited_at,
            CASE WHEN out_event.id IS NULL THEN 'inside' ELSE 'completed' END AS session_status
         FROM scan_events in_event
         JOIN learners l ON l.id = in_event.learner_id
         LEFT JOIN LATERAL (
           SELECT se.id, se.scanned_at
           FROM scan_events se
           WHERE se.learner_id = in_event.learner_id
             AND se.scan_type = 'library_out'
             AND se.scanned_at > in_event.scanned_at
             AND DATE(se.scanned_at) = DATE(in_event.scanned_at)
           ORDER BY se.scanned_at ASC
           LIMIT 1
         ) out_event ON TRUE
         WHERE in_event.scan_type = 'library_in'
           AND DATE(in_event.scanned_at) = CURRENT_DATE
         ORDER BY in_event.scanned_at DESC`
      );
      return res.json({ kind, rows: result.rows });
    }

    if (kind === 'scans_today') {
      const result = await pool.query(
        `SELECT se.id, se.scan_type, se.scanner_location, se.scanned_at,
                l.card_id, l.first_name, l.last_name, l.class_name, l.section, l.learner_type,
                l.registration_number, l.photo_url
         FROM scan_events se
         JOIN learners l ON l.id = se.learner_id
         WHERE DATE(se.scanned_at) = CURRENT_DATE
         ORDER BY se.scanned_at DESC
         LIMIT 200`
      );
      return res.json({ kind, rows: result.rows });
    }

    if (kind === 'staff_in_school') {
      const result = await pool.query(
        `SELECT id, card_id, first_name, last_name, department, job_title, last_scan_at
         FROM staff_members
         WHERE is_in_school = TRUE AND is_active = TRUE
         ORDER BY last_name, first_name`
      );
      return res.json({ kind, rows: result.rows });
    }

    if (kind === 'visitors_today') {
      const result = await pool.query(
        `SELECT id, full_name, phone, purpose, host_name, check_in_at, check_out_at
         FROM visitors
         WHERE DATE(check_in_at) = CURRENT_DATE
         ORDER BY check_in_at DESC`
      );
      return res.json({ kind, rows: result.rows });
    }

    return res.status(400).json({ error: 'Unknown dashboard detail type.' });
  } catch (err) {
    console.error('Dashboard details error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard details.' });
  }
}

async function resetDailyLunch(req, res) {
  try {
    await pool.query(`UPDATE learner_status SET lunch_today = FALSE`);
    res.json({ message: 'Daily lunch records reset.' });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed.' });
  }
}

module.exports = { processScan, getDashboardStats, getDashboardDetails, resetDailyLunch };
