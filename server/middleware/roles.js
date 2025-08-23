function adminOnly(req, res, next) {
  if (!req.user || req.user.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
}

module.exports = { adminOnly };
