const pool = require('../config/db');

function notificationScope(req, params) {
  const filters = [];
  if (req.user?.role !== 'admin') {
    const allowed = req.user?.notification_access || [];
    if (!allowed.includes('*')) {
      if (allowed.length === 0) {
        filters.push('FALSE');
      } else {
        params.push(allowed);
        filters.push(`n.event_type = ANY($${params.length})`);
      }
    }
  }
  return filters;
}

async function getNotifications(req, res) {
  const { unread_only, limit = 50 } = req.query;
  try {
    const params = [];
    const filters = [];
    let query = `
      SELECT n.*, l.first_name, l.last_name, l.card_id, l.registration_number, l.photo_url,
             o.name as office_name
      FROM notifications n
      LEFT JOIN learners l ON n.learner_id = l.id
      LEFT JOIN offices o ON n.office_id = o.id
    `;
    if (unread_only === 'true') {
      filters.push('n.is_read = FALSE');
    }

    filters.push(...notificationScope(req, params));

    if (filters.length) query += ` WHERE ${filters.join(' AND ')}`;
    params.push(parseInt(limit));
    query += ` ORDER BY n.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

async function markAsRead(req, res) {
  const { id } = req.params;
  try {
    const params = [id];
    const filters = ['n.id = $1', ...notificationScope(req, params)];
    const result = await pool.query(
      `UPDATE notifications n SET is_read = TRUE WHERE ${filters.join(' AND ')} RETURNING n.id`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

async function markAllRead(req, res) {
  try {
    const params = [];
    const filters = ['n.is_read = FALSE', ...notificationScope(req, params)];
    await pool.query(`UPDATE notifications n SET is_read = TRUE WHERE ${filters.join(' AND ')}`, params);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}

async function getOffices(req, res) {
  try {
    const result = await pool.query('SELECT * FROM offices ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offices.' });
  }
}

module.exports = { getNotifications, markAsRead, markAllRead, getOffices };
