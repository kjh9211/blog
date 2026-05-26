export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/admin/auth/discord');
}
