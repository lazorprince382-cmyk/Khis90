const pool = require('../config/db');
const { generateCardId, generateQRCode, generateBarcode, uuidv4 } = require('../utils/cardGenerator');

async function registerStaff(req, res) {
  const { first_name, last_name, department, job_title } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'First and last name required.' });
  }
  try {
    const id = uuidv4();
    const cardId = (await generateCardId()).replace('KIS', 'KISST');
    const qrCodeData = await generateQRCode(cardId, id);
    const barcodeData = generateBarcode(cardId);
    const result = await pool.query(
      `INSERT INTO staff_members (id, card_id, first_name, last_name, department, job_title, qr_code_data, barcode_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, cardId, first_name, last_name, department, job_title, qrCodeData, barcodeData]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to register staff.' });
  }
}

async function listStaff(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM staff_members WHERE is_active = TRUE ORDER BY last_name, first_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff.' });
  }
}

async function scanStaff(req, res, io) {
  const { card_id, scan_type, scanner_location } = req.body;
  if (!card_id || !['staff_in', 'staff_out'].includes(scan_type)) {
    return res.status(400).json({ error: 'Invalid staff scan.' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM staff_members WHERE card_id = $1 AND is_active = TRUE',
      [card_id.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff card not recognized.' });
    }
    const staff = result.rows[0];
    const inSchool = scan_type === 'staff_in';

    if (inSchool && staff.is_in_school) {
      return res.status(400).json({ success: false, status: 'denied', message: `${staff.first_name} is already in school.` });
    }
    if (!inSchool && !staff.is_in_school) {
      return res.status(400).json({ success: false, status: 'denied', message: `${staff.first_name} is not in school.` });
    }

    await pool.query(
      `INSERT INTO staff_scan_events (staff_id, scan_type, scanner_location) VALUES ($1, $2, $3)`,
      [staff.id, scan_type, scanner_location]
    );
    await pool.query(
      `UPDATE staff_members SET is_in_school = $1, last_scan_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [inSchool, staff.id]
    );

    const message = `${staff.first_name} ${staff.last_name} (${staff.job_title || 'Staff'}) ${inSchool ? 'entered' : 'left'} the school.`;
    const officeResult = await pool.query(`SELECT id FROM offices WHERE name = 'Security Office'`);
    if (officeResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (office_id, message, event_type) VALUES ($1, $2, $3)`,
        [officeResult.rows[0].id, message, scan_type]
      );
    }

    const response = { success: true, status: 'approved', message, staff };
    if (io) io.emit('scan_event', response);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Staff scan failed.' });
  }
}

module.exports = { registerStaff, listStaff, scanStaff };
