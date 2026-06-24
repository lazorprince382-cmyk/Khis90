const express = require('express');
const router = express.Router();
const { checkIn, checkOut, listVisitors } = require('../controllers/visitorController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, listVisitors);
router.post('/check-in', authenticate, authorize('visitors'), checkIn);
router.post('/:id/check-out', authenticate, authorize('visitors'), checkOut);

module.exports = router;
