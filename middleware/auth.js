const jwt = require('jsonwebtoken');

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Verifies the admin JWT and rejects the request when it is missing or invalid. */
function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please sign in again.' });
  }
}

/**
 * Decodes the admin JWT when a token is supplied. Requests without a token
 * stay public; requests with an invalid token are rejected so the Admin panel
 * never silently falls back to the public (active-only) gallery view.
 */
function optionalAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please sign in again.' });
  }
}

module.exports = { requireAdmin, optionalAdmin };
