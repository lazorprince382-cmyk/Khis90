const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const ROLE_DEFAULTS = {
  admin: {
    dashboard_access: ['*'],
    notification_access: ['*'],
  },
  security: {
    dashboard_access: ['/', '/lookup', '/scan/gate', '/scan/lunch', '/notifications', '/messages', '/visitors', '/staff'],
    notification_access: ['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'visitor_in', 'visitor_out', 'staff_in', 'staff_out'],
  },
  librarian: {
    dashboard_access: ['/', '/lookup', '/scan/library', '/notifications', '/messages'],
    notification_access: ['library_in', 'library_out'],
  },
  cafeteria: {
    dashboard_access: ['/', '/lookup', '/scan/lunch', '/notifications', '/messages'],
    notification_access: ['lunch'],
  },
  staff: {
    dashboard_access: ['/', '/lookup', '/notifications', '/messages'],
    notification_access: ['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'lunch', 'library_in', 'library_out'],
  },
};

function accessFor(role, field, provided) {
  if (Array.isArray(provided)) return provided;
  return ROLE_DEFAULTS[role]?.[field] || ROLE_DEFAULTS.staff[field];
}

function userPayload(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    office_id: user.office_id,
    dashboard_access: user.dashboard_access || [],
    notification_access: user.notification_access || [],
  };
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  try {
    const result = await pool.query(
      'SELECT id, username, password_hash, full_name, role, office_id, dashboard_access, notification_access FROM users WHERE username = $1',
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
    const session = await pool.query(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent)
       VALUES ($1, $2, $3) RETURNING token_id`,
      [user.id, req.ip || null, req.headers['user-agent'] || null]
    );
    user.session_id = session.rows[0].token_id;
    const token = signToken(user);
    await logAudit({ user, ip: req.ip, headers: req.headers }, 'auth.login', 'user', user.id);
    res.json({
      token,
      user: userPayload(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
}

async function getMe(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, office_id, dashboard_access, notification_access FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ user: result.rows[0] || req.user });
  } catch {
    res.json({ user: req.user });
  }
}

async function createUser(req, res) {
  const { username, password, full_name, role = 'staff', office_id, dashboard_access, notification_access } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name required.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, office_id, dashboard_access, notification_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, full_name, role, office_id, dashboard_access, notification_access, created_at`,
      [
        username,
        hash,
        full_name,
        role,
        office_id || null,
        accessFor(role, 'dashboard_access', dashboard_access),
        accessFor(role, 'notification_access', notification_access),
      ]
    );
    await logAudit(req, 'account.created', 'user', result.rows[0].id, { username, role });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists.' });
    res.status(500).json({ error: 'Failed to create user.' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { username, password, full_name, role = 'staff', office_id, dashboard_access, notification_access } = req.body;
  if (!username || !full_name) {
    return res.status(400).json({ error: 'Username and full name required.' });
  }
  try {
    const params = [
      username,
      full_name,
      role,
      office_id || null,
      accessFor(role, 'dashboard_access', dashboard_access),
      accessFor(role, 'notification_access', notification_access),
      id,
    ];
    let passwordSql = '';
    if (password) {
      params.push(await bcrypt.hash(password, 10));
      passwordSql = `, password_hash = $${params.length}`;
    }
    const result = await pool.query(
      `UPDATE users
       SET username = $1, full_name = $2, role = $3, office_id = $4,
           dashboard_access = $5, notification_access = $6${passwordSql}
       WHERE id = $7
       RETURNING id, username, full_name, role, office_id, dashboard_access, notification_access, created_at`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    await logAudit(req, 'account.updated', 'user', id, { username, role, password_changed: Boolean(password) });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists.' });
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update account.' });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account while signed in.' });
  }
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    await logAudit(req, 'account.deleted', 'user', id);
    res.json({ message: 'Account deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
}

async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.role, u.office_id, u.created_at,
              u.dashboard_access, u.notification_access, o.name AS office_name
       FROM users u LEFT JOIN offices o ON u.office_id = o.id ORDER BY u.full_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Current and new password are required.' });
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0]?.password_hash || '');
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    await logAudit(req, 'password.changed', 'user', req.user.id);
    res.json({ message: 'Password changed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
}

async function resetPassword(req, res) {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    await pool.query('UPDATE user_sessions SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1', [req.params.id]);
    await logAudit(req, 'password.reset', 'user', req.params.id);
    res.json({ message: 'Password reset and sessions revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
}

module.exports = { login, getMe, createUser, updateUser, deleteUser, listUsers, changePassword, resetPassword };
