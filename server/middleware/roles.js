// Resolve user role from various places populated by auth middleware
function getRequestRole(req) {
  return (req.userRole || req.user?.role || '').toString().toLowerCase();
}

// Middleware: allow only Admins
function adminOnly(req, res, next) {
  const role = getRequestRole(req);
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

// Middleware factory: allow a set of roles
function authorizeRoles(...allowedRoles) {
  const allowed = allowedRoles.map(r => r.toString().toLowerCase());
  return (req, res, next) => {
    const role = getRequestRole(req);
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { adminOnly, authorizeRoles };
