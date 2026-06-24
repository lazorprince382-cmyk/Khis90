const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  registerLearner, getLearner, searchLearners, getLearnerActivity,
  getAllLearners, getLearnerCard, bulkImport, updateLearnerPhoto, updateLearnerClass,
  updateLearner, deleteLearner,
} = require('../controllers/learnerController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin'), upload.single('photo'), registerLearner);
router.post('/bulk', authenticate, authorize('admin'), bulkImport);
router.get('/search', authenticate, searchLearners);
router.get('/all', authenticate, getAllLearners);
router.get('/:id/card', authenticate, getLearnerCard);
router.get('/:id/activity', authenticate, getLearnerActivity);
router.post('/:id/photo', authenticate, authorize('admin'), upload.single('photo'), updateLearnerPhoto);
router.patch('/:id', authenticate, authorize('admin'), upload.single('photo'), updateLearner);
router.delete('/:id', authenticate, authorize('admin'), deleteLearner);
router.get('/:id', authenticate, getLearner);

module.exports = router;
