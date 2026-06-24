const express = require('express');
const router = express.Router();
const {
  listOffices, createOffice, updateOffice, deactivateOffice,
  getOfficeDashboard, authorizeExeat, revokeExeat,
} = require('../controllers/officeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, listOffices);
router.get('/my/dashboard', authenticate, (req, res) => {
  if (!req.user.office_id && req.user.role !== 'admin') {
    return res.status(400).json({ error: 'No office assigned to your account.' });
  }
  req.params.id = req.user.office_id;
  return getOfficeDashboard(req, res);
});
router.post('/', authenticate, authorize('admin'), createOffice);
router.put('/:id', authenticate, authorize('admin'), updateOffice);
router.delete('/:id', authenticate, authorize('admin'), deactivateOffice);
router.get('/:id/dashboard', authenticate, getOfficeDashboard);
router.post('/exeat/authorize', authenticate, authorizeExeat);
router.post('/exeat/revoke', authenticate, revokeExeat);

module.exports = router;
