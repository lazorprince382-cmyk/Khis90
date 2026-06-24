const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  listAuditLogs,
  listSessions,
  revokeSession,
  listPermissionTemplates,
  createPermissionTemplate,
  deletePermissionTemplate,
  downloadBackup,
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin'));
router.get('/audit-logs', listAuditLogs);
router.get('/sessions', listSessions);
router.patch('/sessions/:id/revoke', revokeSession);
router.get('/permission-templates', listPermissionTemplates);
router.post('/permission-templates', createPermissionTemplate);
router.delete('/permission-templates/:id', deletePermissionTemplate);
router.get('/backup', downloadBackup);

module.exports = router;
