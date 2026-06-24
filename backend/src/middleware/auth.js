const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kis-school-secret-change-in-production';

const ROLE_PERMISSIONS = {
  admin: ['*'],
  security: ['dashboard', 'lookup', 'scan_gate', 'scan_lunch', 'notifications', 'visitors', 'staff_view'],
  librarian: ['dashboard', 'lookup', 'scan_library', 'notifications'],
  cafeteria: ['dashboard', 'lookup', 'scan_lunch', 'notifications'],
  staff: ['dashboard', 'lookup', 'notifications'],
  office_manager: ['dashboard', 'lookup', 'notifications', 'office_dashboard', 'exeat'],
};

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
}

function authorize(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const rolePerms = ROLE_PERMISSIONS[req.user.role] || [];
    if (rolePerms.includes('*') || permissions.some((p) => rolePerms.includes(p))) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions.' });
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name, office_id: user.office_id || null },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = { authenticate, optionalAuth, authorize, signToken, JWT_SECRET, ROLE_PERMISSIONS };
