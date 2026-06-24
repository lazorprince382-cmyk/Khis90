const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../middleware/auth');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  try {
    const result = await pool.query(
      'SELECT id, username, password_hash, full_name, role, office_id FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, office_id: user.office_id },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
}

async function getMe(req, res) {
  res.json({ user: req.user });
}

async function createUser(req, res) {
  const { username, password, full_name, role, office_id } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name required.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, office_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role, office_id, created_at`,
      [username, hash, full_name, role || 'staff', office_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists.' });
    res.status(500).json({ error: 'Failed to create user.' });
  }
}

async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.role, u.office_id, u.created_at, o.name AS office_name
       FROM users u LEFT JOIN offices o ON u.office_id = o.id ORDER BY u.full_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

module.exports = { login, getMe, createUser, listUsers };
