const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY = '12h';

/** Constant-time string comparison to avoid trivial timing attacks. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // burn comparable time before failing
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.login = (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({ message: 'Admin credentials are not configured on the server.' });
  }

  const emailMatches = safeEqual(email || '', adminEmail);
  const passwordMatches = safeEqual(password || '', adminPassword);
  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign({ role: 'admin', email: adminEmail }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
  res.json({ token });
};
