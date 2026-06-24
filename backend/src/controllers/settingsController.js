const pool = require('../config/db');

async function getSettings(req, res) {
  try {
    const [settings, holidays, terms] = await Promise.all([
      pool.query('SELECT * FROM school_settings WHERE id = 1'),
      pool.query('SELECT * FROM holidays ORDER BY holiday_date DESC'),
      pool.query('SELECT * FROM academic_terms ORDER BY year DESC, start_date DESC'),
    ]);
    res.json({
      settings: settings.rows[0],
      holidays: holidays.rows,
      terms: terms.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
}

async function updateSettings(req, res) {
  const { late_arrival_time, early_departure_time, school_open_time, school_close_time, scan_cooldown_seconds } = req.body;
  try {
    const result = await pool.query(
      `UPDATE school_settings SET
        late_arrival_time = COALESCE($1, late_arrival_time),
        early_departure_time = COALESCE($2, early_departure_time),
        school_open_time = COALESCE($3, school_open_time),
        school_close_time = COALESCE($4, school_close_time),
        scan_cooldown_seconds = COALESCE($5, scan_cooldown_seconds),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 1 RETURNING *`,
      [late_arrival_time, early_departure_time, school_open_time, school_close_time, scan_cooldown_seconds]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
}

async function addHoliday(req, res) {
  const { name, holiday_date, is_closed } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO holidays (name, holiday_date, is_closed) VALUES ($1, $2, $3) RETURNING *`,
      [name, holiday_date, is_closed !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Holiday date already exists.' });
    res.status(500).json({ error: 'Failed to add holiday.' });
  }
}

async function deleteHoliday(req, res) {
  try {
    await pool.query('DELETE FROM holidays WHERE id = $1', [req.params.id]);
    res.json({ message: 'Holiday deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete holiday.' });
  }
}

async function addTerm(req, res) {
  const { name, year, start_date, end_date, is_current } = req.body;
  try {
    if (is_current) {
      await pool.query('UPDATE academic_terms SET is_current = FALSE');
    }
    const result = await pool.query(
      `INSERT INTO academic_terms (name, year, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, year, start_date, end_date, is_current || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add term.' });
  }
}

async function setCurrentTerm(req, res) {
  try {
    await pool.query('UPDATE academic_terms SET is_current = FALSE');
    const result = await pool.query(
      'UPDATE academic_terms SET is_current = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set current term.' });
  }
}

module.exports = { getSettings, updateSettings, addHoliday, deleteHoliday, addTerm, setCurrentTerm };
