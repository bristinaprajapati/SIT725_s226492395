// Helpers for signing JWTs in tests, so protected routes can be exercised.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const jwt = require('jsonwebtoken');

const sign = (role) =>
  `Bearer ${jwt.sign({ userId: 'test-user', role }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;

module.exports = {
  adminAuth: () => sign('admin'),
  studentAuth: () => sign('student')
};