const pool = require('../config/db');

async function listContacts(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         u.id, u.username, u.full_name, u.role,
         (
           SELECT body FROM messages m
           WHERE (m.sender_id = $1 AND m.recipient_id = u.id)
              OR (m.sender_id = u.id AND m.recipient_id = $1)
           ORDER BY m.created_at DESC LIMIT 1
         ) AS last_message,
         (
           SELECT created_at FROM messages m
           WHERE (m.sender_id = $1 AND m.recipient_id = u.id)
              OR (m.sender_id = u.id AND m.recipient_id = $1)
           ORDER BY m.created_at DESC LIMIT 1
         ) AS last_message_at,
         (
           SELECT COUNT(*)::int FROM messages m
           WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.is_read = FALSE
         ) AS unread_count
       FROM users u
       WHERE u.id <> $1
       ORDER BY COALESCE((
         SELECT created_at FROM messages m
         WHERE (m.sender_id = $1 AND m.recipient_id = u.id)
            OR (m.sender_id = u.id AND m.recipient_id = $1)
         ORDER BY m.created_at DESC LIMIT 1
       ), u.created_at) DESC, u.full_name ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List contacts error:', err);
    res.status(500).json({ error: 'Failed to load contacts.' });
  }
}

async function getConversation(req, res) {
  const { userId } = req.params;
  try {
    await pool.query(
      `UPDATE messages
       SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE sender_id = $1 AND recipient_id = $2 AND is_read = FALSE`,
      [userId, req.user.id]
    );
    const result = await pool.query(
      `SELECT m.*, s.full_name AS sender_name, r.full_name AS recipient_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.recipient_id
       WHERE (m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1)
       ORDER BY m.created_at ASC
       LIMIT 300`,
      [req.user.id, userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Failed to load conversation.' });
  }
}

async function sendMessage(req, res, io) {
  const { recipient_id, body, is_voice_note } = req.body;
  const text = String(body || '').trim();
  const file = req.file;
  if (!recipient_id || (!text && !file)) {
    return res.status(400).json({ error: 'Recipient and message or attachment are required.' });
  }
  if (recipient_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot send a message to yourself.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO messages (
         sender_id, recipient_id, body, attachment_url, attachment_name,
         attachment_mime, attachment_size, is_voice_note
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        recipient_id,
        text,
        file ? `/uploads/messages/${file.filename}` : null,
        file ? file.originalname : null,
        file ? file.mimetype : null,
        file ? file.size : null,
        is_voice_note === 'true' || is_voice_note === true,
      ]
    );
    const message = {
      ...result.rows[0],
      sender_name: req.user.full_name,
    };
    io.emit('message:new', message);
    res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
}

async function markConversationRead(req, res) {
  const { userId } = req.params;
  try {
    await pool.query(
      `UPDATE messages
       SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE sender_id = $1 AND recipient_id = $2 AND is_read = FALSE`,
      [userId, req.user.id]
    );
    res.json({ message: 'Conversation marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
}

module.exports = { listContacts, getConversation, sendMessage, markConversationRead };
