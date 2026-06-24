const pool = require('../config/db');
const { generateCardId, generateQRCode, generateBarcode } = require('../utils/cardGenerator');

async function generateUniqueCardAssets(client, learner) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const cardId = await generateCardId();
    const exists = await client.query('SELECT 1 FROM learners WHERE card_id = $1', [cardId]);
    if (exists.rows.length === 0) {
      return {
        cardId,
        qrCodeData: await generateQRCode(cardId, learner.id, {
          name: `${learner.first_name} ${learner.last_name}`,
          registration_number: learner.registration_number,
        }),
        barcodeData: generateBarcode(cardId),
      };
    }
  }
  throw new Error('Could not generate a unique card ID.');
}

async function deactivateCard(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const learner = await client.query('SELECT * FROM learners WHERE id::text = $1 OR card_id = $1', [id]);
    if (learner.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Learner not found.' });
    }
    const l = learner.rows[0];
    if (!l.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Card is already deactivated.' });
    }

    await client.query(
      `UPDATE learners SET is_active = FALSE, card_deactivated_at = CURRENT_TIMESTAMP,
       deactivation_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [reason || 'Lost/stolen card', l.id]
    );
    await client.query(
      `INSERT INTO card_history (learner_id, old_card_id, action, reason, performed_by)
       VALUES ($1, $2, 'deactivated', $3, $4)`,
      [l.id, l.card_id, reason || 'Lost/stolen card', req.user?.id || null]
    );
    await client.query(
      `UPDATE learner_status SET current_location = 'out_of_school' WHERE learner_id = $1`,
      [l.id]
    );
    await client.query('COMMIT');
    res.json({ message: `Card ${l.card_id} deactivated.`, learner_id: l.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to deactivate card.' });
  } finally {
    client.release();
  }
}

async function reissueCard(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const learner = await client.query('SELECT * FROM learners WHERE id::text = $1 OR card_id = $1', [id]);
    if (learner.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Learner not found.' });
    }
    const l = learner.rows[0];
    const oldCardId = l.card_id;
    const { cardId: newCardId, qrCodeData, barcodeData } = await generateUniqueCardAssets(client, l);

    await client.query(
      `UPDATE learners SET card_id = $1, qr_code_data = $2, barcode_data = $3,
       is_active = TRUE, card_deactivated_at = NULL, deactivation_reason = NULL,
       updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [newCardId, qrCodeData, barcodeData, l.id]
    );
    await client.query(
      `INSERT INTO card_history (learner_id, old_card_id, new_card_id, action, reason, performed_by)
       VALUES ($1, $2, $3, 'reissued', $4, $5)`,
      [l.id, oldCardId, newCardId, reason || 'Card reissued', req.user?.id || null]
    );
    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM learners WHERE id = $1', [l.id]);
    res.json({
      message: `New card issued: ${newCardId} (old: ${oldCardId})`,
      learner: updated.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reissue card.' });
  } finally {
    client.release();
  }
}

async function getCardHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT ch.*, u.full_name as performed_by_name
       FROM card_history ch
       LEFT JOIN users u ON ch.performed_by = u.id
       WHERE ch.learner_id::text = $1 OR ch.learner_id = (SELECT id FROM learners WHERE card_id = $1)
       ORDER BY ch.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch card history.' });
  }
}

module.exports = { deactivateCard, reissueCard, getCardHistory };
