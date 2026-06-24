const pool = require('../config/db');
const { generateCardId, generateQRCode, generateBarcode, uuidv4 } = require('../utils/cardGenerator');

async function generateUniqueCardAssets(client, learnerId, learnerPayload) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const cardId = await generateCardId();
    const exists = await client.query('SELECT 1 FROM learners WHERE card_id = $1', [cardId]);
    if (exists.rows.length === 0) {
      return {
        cardId,
        qrCodeData: await generateQRCode(cardId, learnerId, learnerPayload),
        barcodeData: generateBarcode(cardId),
      };
    }
  }
  throw new Error('Could not generate a unique card ID.');
}

async function registerLearner(req, res) {
  const { first_name, last_name, class_name, date_of_birth, parent_phone, parent_email,
    learner_type, section, boarding_house, registration_number, card_expires_at } = req.body;

  if (!first_name || !last_name || !class_name || !registration_number) {
    return res.status(400).json({ error: 'First name, last name, class, and registration number are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const learnerId = uuidv4();
    const cleanRegNo = registration_number.trim();
    const fullName = `${first_name} ${last_name}`;
    const { cardId, qrCodeData, barcodeData } = await generateUniqueCardAssets(client, learnerId, {
      name: fullName,
      registration_number: cleanRegNo,
    });
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const learnerResult = await client.query(
      `INSERT INTO learners (id, card_id, first_name, last_name, class_name, date_of_birth, parent_phone, parent_email,
        qr_code_data, barcode_data, learner_type, section, boarding_house, registration_number, card_expires_at, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [learnerId, cardId, first_name, last_name, class_name, date_of_birth || null, parent_phone || null,
        parent_email || null, qrCodeData, barcodeData, learner_type || 'day', section || null, boarding_house || null,
        cleanRegNo, card_expires_at || null, photoUrl]
    );

    await client.query(
      `INSERT INTO learner_status (learner_id, current_location) VALUES ($1, 'out_of_school')`,
      [learnerId]
    );

    await client.query('COMMIT');

    const learner = learnerResult.rows[0];
    res.status(201).json({
      message: 'Learner registered successfully. ID card generated.',
      learner: {
        ...learner,
        qr_code_data: qrCodeData,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Registration number or card ID already exists.' });
    }
    console.error('Register learner error:', err);
    res.status(500).json({ error: 'Failed to register learner.' });
  } finally {
    client.release();
  }
}

async function getLearner(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT l.*, ls.current_location, ls.last_scan_at, ls.lunch_today
       FROM learners l
       LEFT JOIN learner_status ls ON l.id = ls.learner_id
       WHERE l.id::text = $1 OR l.card_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Learner not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get learner error:', err);
    res.status(500).json({ error: 'Failed to fetch learner.' });
  }
}

async function searchLearners(req, res) {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required.' });
  }
  try {
    const result = await pool.query(
      `SELECT l.id, l.card_id, l.first_name, l.last_name, l.class_name, l.is_active,
              l.registration_number, l.photo_url, l.card_expires_at,
              ls.current_location, ls.last_scan_at, ls.lunch_today
       FROM learners l
       LEFT JOIN learner_status ls ON l.id = ls.learner_id
       WHERE l.is_active = TRUE AND (
         l.first_name ILIKE $1 OR l.last_name ILIKE $1 OR
         l.card_id ILIKE $1 OR l.registration_number ILIKE $1 OR l.class_name ILIKE $1 OR
         CONCAT(l.first_name, ' ', l.last_name) ILIKE $1
       )
       ORDER BY l.last_name, l.first_name
       LIMIT 50`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Search learners error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
}

async function getLearnerActivity(req, res) {
  const { id } = req.params;
  const { date } = req.query;
  try {
    let query = `
      SELECT se.*, l.first_name, l.last_name, l.card_id
      FROM scan_events se
      JOIN learners l ON se.learner_id = l.id
      WHERE se.learner_id::text = $1 OR l.card_id = $1
    `;
    const params = [id];

    if (date) {
      query += ` AND DATE(se.scanned_at) = $2`;
      params.push(date);
    }

    query += ' ORDER BY se.scanned_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity.' });
  }
}

async function getAllLearners(req, res) {
  const { q = '', class_name = '' } = req.query;
  try {
    const params = [];
    const filters = ['l.is_active = TRUE'];
    if (q.trim()) {
      params.push(`%${q.trim()}%`);
      filters.push(`(
        l.first_name ILIKE $${params.length} OR l.last_name ILIKE $${params.length} OR
        CONCAT(l.first_name, ' ', l.last_name) ILIKE $${params.length} OR
        l.card_id ILIKE $${params.length} OR l.registration_number ILIKE $${params.length}
      )`);
    }
    if (class_name.trim()) {
      params.push(class_name.trim());
      filters.push(`l.class_name = $${params.length}`);
    }
    const result = await pool.query(
      `SELECT l.id, l.card_id, l.registration_number, l.first_name, l.last_name, l.class_name,
              l.section, l.learner_type, l.boarding_house, l.date_of_birth, l.parent_phone,
              l.parent_email, l.photo_url, l.card_expires_at, l.qr_code_data, l.barcode_data,
              l.is_active, l.created_at,
              ls.current_location, ls.last_scan_at, ls.lunch_today
       FROM learners l
       LEFT JOIN learner_status ls ON l.id = ls.learner_id
       WHERE ${filters.join(' AND ')}
       ORDER BY l.last_name, l.first_name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get all learners error:', err);
    res.status(500).json({ error: 'Failed to fetch learners.' });
  }
}

async function getLearnerCard(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, card_id, registration_number, first_name, last_name, class_name,
              photo_url, card_expires_at, qr_code_data, barcode_data
       FROM learners WHERE id::text = $1 OR card_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Learner not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get card error:', err);
    res.status(500).json({ error: 'Failed to fetch card.' });
  }
}

async function bulkImport(req, res) {
  const { learners } = req.body;
  if (!Array.isArray(learners) || learners.length === 0) {
    return res.status(400).json({ error: 'Learners array required.' });
  }
  const client = await pool.connect();
  const results = { success: 0, failed: 0, errors: [] };
  try {
    for (const row of learners) {
      if (!row.first_name || !row.last_name || !row.class_name || !row.registration_number) {
        results.failed++;
        results.errors.push({ row, error: 'Missing required fields, including registration number' });
        continue;
      }
      try {
        const learnerId = uuidv4();
        const cleanRegNo = row.registration_number.trim();
        const { cardId, qrCodeData, barcodeData } = await generateUniqueCardAssets(client, learnerId, {
          name: `${row.first_name} ${row.last_name}`,
          registration_number: cleanRegNo,
        });
        await client.query(
          `INSERT INTO learners (id, card_id, registration_number, first_name, last_name, class_name,
             date_of_birth, parent_phone, parent_email, qr_code_data, barcode_data, card_expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [learnerId, cardId, cleanRegNo, row.first_name, row.last_name, row.class_name,
           row.date_of_birth || null, row.parent_phone || null, row.parent_email || null, qrCodeData, barcodeData,
           row.card_expires_at || null]
        );
        await client.query(`INSERT INTO learner_status (learner_id) VALUES ($1)`, [learnerId]);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          row,
          error: err.code === '23505' ? 'Registration number or card ID already exists' : err.message,
        });
      }
    }
    res.json(results);
  } finally {
    client.release();
  }
}

async function updateLearnerPhoto(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'Photo file required.' });
  const photoUrl = `/uploads/${req.file.filename}`;
  try {
    const result = await pool.query(
      `UPDATE learners SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $2 OR card_id = $2 RETURNING *`,
      [photoUrl, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update photo.' });
  }
}

async function updateLearnerClass(req, res) {
  const { id } = req.params;
  const { class_name, term_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE learners SET class_name = COALESCE($1, class_name), term_id = COALESCE($2, term_id),
       updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [class_name, term_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update learner.' });
  }
}

async function updateLearner(req, res) {
  const { id } = req.params;
  const {
    first_name, last_name, class_name, date_of_birth, parent_phone, parent_email,
    learner_type, section, boarding_house, registration_number, card_expires_at,
  } = req.body;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const cleanRegNo = registration_number?.trim() || null;
    if (cleanRegNo) {
      const duplicate = await pool.query(
        `SELECT 1 FROM learners WHERE LOWER(registration_number) = LOWER($1) AND id <> $2`,
        [cleanRegNo, id]
      );
      if (duplicate.rows.length) return res.status(409).json({ error: 'Registration number already exists.' });
    }

    const result = await pool.query(
      `UPDATE learners SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         class_name = COALESCE($3, class_name),
         date_of_birth = COALESCE($4, date_of_birth),
         parent_phone = COALESCE($5, parent_phone),
         parent_email = COALESCE($6, parent_email),
         learner_type = COALESCE($7, learner_type),
         section = COALESCE($8, section),
         boarding_house = COALESCE($9, boarding_house),
         registration_number = COALESCE($10, registration_number),
         card_expires_at = COALESCE($11, card_expires_at),
         photo_url = COALESCE($12, photo_url),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        first_name || null, last_name || null, class_name || null, date_of_birth || null,
        parent_phone || null, parent_email || null, learner_type || null, section || null,
        boarding_house || null, cleanRegNo, card_expires_at || null,
        photoUrl, id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Registration number already exists.' });
    console.error('Update learner error:', err);
    res.status(500).json({ error: 'Failed to update learner.' });
  }
}

async function deleteLearner(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE learners SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
    res.json({ message: 'Learner deleted.' });
  } catch (err) {
    console.error('Delete learner error:', err);
    res.status(500).json({ error: 'Failed to delete learner.' });
  }
}

module.exports = {
  registerLearner, getLearner, searchLearners, getLearnerActivity,
  getAllLearners, getLearnerCard, bulkImport, updateLearnerPhoto, updateLearnerClass,
  updateLearner, deleteLearner,
};
