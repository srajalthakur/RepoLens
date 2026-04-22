// Protects routes — returns 401 if user is not logged in
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
  }
  
  module.exports = { requireAuth };