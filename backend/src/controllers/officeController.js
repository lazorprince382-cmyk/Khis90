const pool = require('../config/db');

async function listOffices(req, res) {
  try {
    const result = await pool.query(
      `SELECT o.*, COUNT(u.id)::int AS user_count
       FROM offices o
       LEFT JOIN users u ON u.office_id = o.id AND u.is_active = TRUE
       WHERE o.is_active = TRUE
       GROUP BY o.id
       ORDER BY o.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offices.' });
  }
}

async function createOffice(req, res) {
  const {
    name, department, email, description,
    monitor_classes, monitor_sections, monitor_learner_types, dashboard_color,
  } = req.body;
  if (!name || !department) {
    return res.status(400).json({ error: 'Name and department are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO offices (name, department, email, description, monitor_classes,
        monitor_sections, monitor_learner_types, dashboard_color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        name, department, email || null, description || null,
        monitor_classes || [], monitor_sections || [],
        monitor_learner_types || ['day', 'boarding'],
        dashboard_color || '#7B1E3A', req.user?.id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create office.' });
  }
}

async function updateOffice(req, res) {
  const { id } = req.params;
  const fields = req.body;
  try {
    const result = await pool.query(
      `UPDATE offices SET
        name = COALESCE($1, name),
        department = COALESCE($2, department),
        email = COALESCE($3, email),
        description = COALESCE($4, description),
        monitor_classes = COALESCE($5, monitor_classes),
        monitor_sections = COALESCE($6, monitor_sections),
        monitor_learner_types = COALESCE($7, monitor_learner_types),
        dashboard_color = COALESCE($8, dashboard_color)
       WHERE id = $9 RETURNING *`,
      [
        fields.name, fields.department, fields.email, fields.description,
        fields.monitor_classes, fields.monitor_sections, fields.monitor_learner_types,
        fields.dashboard_color, id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Office not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update office.' });
  }
}

async function deactivateOffice(req, res) {
  try {
    await pool.query('UPDATE offices SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Office deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate office.' });
  }
}

function buildOfficeLearnerFilter(office, paramOffset = 1) {
  const conditions = ['l.is_active = TRUE'];
  const params = [];
  let idx = paramOffset;

  if (office.monitor_learner_types?.length > 0 && office.monitor_learner_types.length < 2) {
    conditions.push(`l.learner_type::text = ANY($${idx})`);
    params.push(office.monitor_learner_types);
    idx++;
  }

  if (office.monitor_classes?.length > 0) {
    conditions.push(`l.class_name = ANY($${idx})`);
    params.push(office.monitor_classes);
    idx++;
  }

  if (office.monitor_sections?.length > 0) {
    conditions.push(`l.section = ANY($${idx})`);
    params.push(office.monitor_sections);
    idx++;
  }

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

async function getOfficeDashboard(req, res) {
  const officeId = req.params.id || req.user?.office_id;
  if (!officeId) return res.status(400).json({ error: 'Office ID required.' });

  try {
    const officeResult = await pool.query('SELECT * FROM offices WHERE id = $1 AND is_active = TRUE', [officeId]);
    if (officeResult.rows.length === 0) return res.status(404).json({ error: 'Office not found.' });
    const office = officeResult.rows[0];

    const filter = buildOfficeLearnerFilter(office);

    const [stats, inSchool, recentScans, onExeat, absent] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM learners l WHERE ${filter.where}`, filter.params),
      pool.query(
        `SELECT l.id, l.first_name, l.last_name, l.class_name, l.section, l.learner_type,
                l.boarding_house, ls.current_location, ls.last_scan_at, ls.lunch_today, l.card_id
         FROM learners l
         JOIN learner_status ls ON l.id = ls.learner_id
         WHERE ${filter.where} AND ls.current_location != 'out_of_school'
         ORDER BY ls.last_scan_at DESC NULLS LAST`,
        filter.params
      ),
      pool.query(
        `SELECT se.*, l.first_name, l.last_name, l.class_name, l.learner_type, l.card_id
         FROM scan_events se
         JOIN learners l ON se.learner_id = l.id
         WHERE ${filter.where.replace(/l\./g, 'l.')} AND DATE(se.scanned_at) = CURRENT_DATE
         ORDER BY se.scanned_at DESC LIMIT 20`,
        filter.params
      ),
      pool.query(
        `SELECT l.id, l.first_name, l.last_name, l.class_name, l.learner_type, l.exeat_reason
         FROM learners l
         WHERE ${filter.where} AND l.exeat_authorized = TRUE
         AND (l.exeat_authorized_until IS NULL OR l.exeat_authorized_until > NOW())`,
        filter.params
      ),
      pool.query(
        `SELECT l.id, l.first_name, l.last_name, l.class_name, l.learner_type, l.section
         FROM learners l
         JOIN learner_status ls ON l.id = ls.learner_id
         WHERE ${filter.where} AND ls.current_location = 'out_of_school'
         AND l.learner_type = 'day'
         AND NOT EXISTS (
           SELECT 1 FROM scan_events se WHERE se.learner_id = l.id
           AND se.scan_type = 'gate_in' AND DATE(se.scanned_at) = CURRENT_DATE
         )`,
        filter.params
      ),
    ]);

    const locationCounts = await pool.query(
      `SELECT ls.current_location, COUNT(*)::int AS count
       FROM learners l JOIN learner_status ls ON l.id = ls.learner_id
       WHERE ${filter.where}
       GROUP BY ls.current_location`,
      filter.params
    );

    const locMap = { in_school: 0, in_library: 0, at_lunch: 0, out_of_school: 0 };
    locationCounts.rows.forEach((r) => { locMap[r.current_location] = r.count; });

    res.json({
      office,
      total_learners: parseInt(stats.rows[0].count),
      location_counts: locMap,
      learners_in_school: inSchool.rows,
      recent_scans_today: recentScans.rows,
      on_exeat: onExeat.rows,
      absent_day_scholars: absent.rows,
    });
  } catch (err) {
    console.error('Office dashboard error:', err);
    res.status(500).json({ error: 'Failed to load office dashboard.' });
  }
}

async function authorizeExeat(req, res) {
  const { learner_id, reason, valid_until } = req.body;
  if (!learner_id) return res.status(400).json({ error: 'Learner ID required.' });

  try {
    const learner = await pool.query('SELECT * FROM learners WHERE id = $1', [learner_id]);
    if (learner.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
    if (learner.rows[0].learner_type !== 'boarding') {
      return res.status(400).json({ error: 'Exeat authorization is only for boarding scholars.' });
    }

    await pool.query(
      `UPDATE learners SET exeat_authorized = TRUE, exeat_reason = $1,
       exeat_authorized_until = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [reason || 'Authorized leave', valid_until || null, learner_id]
    );

    await pool.query(
      `INSERT INTO exeat_log (learner_id, authorized_by, office_id, reason, valid_until)
       VALUES ($1, $2, $3, $4, $5)`,
      [learner_id, req.user?.id, req.user?.office_id, reason, valid_until || null]
    );

    const offices = await pool.query(`SELECT id FROM offices WHERE name IN ('Boarding Office', 'Security Office', 'Main Office')`);
    const l = learner.rows[0];
    for (const o of offices.rows) {
      await pool.query(
        `INSERT INTO notifications (office_id, learner_id, message, event_type) VALUES ($1, $2, $3, 'exeat_authorized')`,
        [o.id, learner_id, `Exeat authorized for ${l.first_name} ${l.last_name}: ${reason || 'Authorized leave'}`]
      );
    }

    res.json({ message: 'Exeat authorized. Boarding scholar may exit gate.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to authorize exeat.' });
  }
}

async function revokeExeat(req, res) {
  const { learner_id } = req.body;
  try {
    await pool.query(
      `UPDATE learners SET exeat_authorized = FALSE, exeat_reason = NULL,
       exeat_authorized_until = NULL WHERE id = $1`,
      [learner_id]
    );
    await pool.query(
      `UPDATE exeat_log SET revoked = TRUE WHERE learner_id = $1 AND used_at IS NULL`,
      [learner_id]
    );
    res.json({ message: 'Exeat revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke exeat.' });
  }
}

module.exports = {
  listOffices, createOffice, updateOffice, deactivateOffice,
  getOfficeDashboard, authorizeExeat, revokeExeat,
};
