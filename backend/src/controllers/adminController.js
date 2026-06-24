const { execFile } = require('child_process');
const path = require('path');
const pool = require('../config/db');
const { logAudit } = require('../utils/audit');

async function listAuditLogs(req, res) {
  const { limit = 100 } = req.query;
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name, u.username
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [Math.min(parseInt(limit, 10) || 100, 500)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
}

async function listSessions(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.*, u.full_name, u.username, u.role
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.last_seen_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load sessions.' });
  }
}

async function revokeSession(req, res) {
  try {
    await pool.query(
      `UPDATE user_sessions SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );
    await logAudit(req, 'session.revoked', 'user_session', req.params.id);
    res.json({ message: 'Session revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke session.' });
  }
}

async function listPermissionTemplates(_req, res) {
  try {
    const result = await pool.query('SELECT * FROM permission_templates ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load permission templates.' });
  }
}

async function createPermissionTemplate(req, res) {
  const { name, role, dashboard_access = [], notification_access = [] } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role are required.' });
  try {
    const result = await pool.query(
      `INSERT INTO permission_templates (name, role, dashboard_access, notification_access, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, role, dashboard_access, notification_access, req.user.id]
    );
    await logAudit(req, 'permission_template.created', 'permission_template', result.rows[0].id, { name, role });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Template name already exists.' });
    res.status(500).json({ error: 'Failed to create permission template.' });
  }
}

async function deletePermissionTemplate(req, res) {
  try {
    await pool.query('DELETE FROM permission_templates WHERE id = $1', [req.params.id]);
    await logAudit(req, 'permission_template.deleted', 'permission_template', req.params.id);
    res.json({ message: 'Template deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete permission template.' });
  }
}

async function downloadBackup(req, res) {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kis_school';
  const filename = `kis-backup-${new Date().toISOString().slice(0, 10)}.sql`;
  const pgDump = process.env.PG_DUMP_PATH || path.join('C:', 'Program Files', 'PostgreSQL', '18', 'bin', 'pg_dump.exe');
  execFile(pgDump, [dbUrl], { maxBuffer: 50 * 1024 * 1024 }, async (err, stdout, stderr) => {
    if (err) {
      console.error('Backup failed:', stderr || err.message);
      return res.status(500).json({ error: 'Backup failed. Check PostgreSQL pg_dump path.' });
    }
    await logAudit(req, 'backup.downloaded', 'database', 'kis_school');
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(stdout);
  });
}

module.exports = {
  listAuditLogs,
  listSessions,
  revokeSession,
  listPermissionTemplates,
  createPermissionTemplate,
  deletePermissionTemplate,
  downloadBackup,
};
