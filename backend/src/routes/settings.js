const express = require('express');
const router = express.Router();
const {
  getSettings, updateSettings, addHoliday, deleteHoliday, addTerm, setCurrentTerm,
} = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getSettings);
router.put('/', authenticate, authorize('admin'), updateSettings);
router.post('/holidays', authenticate, authorize('admin'), addHoliday);
router.delete('/holidays/:id', authenticate, authorize('admin'), deleteHoliday);
router.post('/terms', authenticate, authorize('admin'), addTerm);
router.patch('/terms/:id/current', authenticate, authorize('admin'), setCurrentTerm);

module.exports = router;
