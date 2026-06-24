const pool = require('../config/db');

async function checkIn(req, res) {
  const { full_name, phone, purpose, host_name, id_number, notes } = req.body;
  if (!full_name || !purpose) {
    return res.status(400).json({ error: 'Name and purpose required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO visitors (full_name, phone, purpose, host_name, id_number, notes, checked_in_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [full_name, phone, purpose, host_name, id_number, notes, req.user?.id || null]
    );
    const visitor = result.rows[0];
    const message = `Visitor ${full_name} checked in. Purpose: ${purpose}`;
    const officeResult = await pool.query(`SELECT id FROM offices WHERE name = 'Security Office'`);
    if (officeResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (office_id, message, event_type) VALUES ($1, $2, 'visitor_in')`,
        [officeResult.rows[0].id, message]
      );
    }
    res.status(201).json(visitor);
  } catch (err) {
    res.status(500).json({ error: 'Check-in failed.' });
  }
}

async function checkOut(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE visitors SET check_out_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND check_out_at IS NULL RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found or already checked out.' });
    }
    const visitor = result.rows[0];
    const message = `Visitor ${visitor.full_name} checked out.`;
    const officeResult = await pool.query(`SELECT id FROM offices WHERE name = 'Security Office'`);
    if (officeResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (office_id, message, event_type) VALUES ($1, $2, 'visitor_out')`,
        [officeResult.rows[0].id, message]
      );
    }
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: 'Check-out failed.' });
  }
}

async function listVisitors(req, res) {
  const { active_only } = req.query;
  try {
    let query = 'SELECT * FROM visitors';
    if (active_only === 'true') query += ' WHERE check_out_at IS NULL';
    query += ' ORDER BY check_in_at DESC LIMIT 100';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visitors.' });
  }
}

module.exports = { checkIn, checkOut, listVisitors };
