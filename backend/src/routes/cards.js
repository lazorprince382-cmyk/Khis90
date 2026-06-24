const express = require('express');
const router = express.Router();
const { deactivateCard, reissueCard, getCardHistory } = require('../controllers/cardController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/:id/deactivate', authenticate, authorize('admin'), deactivateCard);
router.post('/:id/reissue', authenticate, authorize('admin'), reissueCard);
router.get('/:id/history', authenticate, getCardHistory);

module.exports = router;
