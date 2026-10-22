/**
 * Application Configuration
 */

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'corebanking-sandbox-owasp-hardened-jwt-secret-2026';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://corebanking-sandbox.onrender.com',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000'
];

module.exports = {
  PORT,
  NODE_ENV,
  JWT_SECRET,
  DEFAULT_ALLOWED_ORIGINS
};
