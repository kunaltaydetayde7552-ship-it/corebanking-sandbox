const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { apiLimiter } = require('../middleware/rateLimiter');

const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const accountRoutes = require('./accountRoutes');
const transactionRoutes = require('./transactionRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const adminRoutes = require('./adminRoutes');

// Apply global rate limiting to all API routes
router.use(apiLimiter);

// Public Auth routes
router.use('/auth', authRoutes);

// API Health Check & Root Info (Sanitized to prevent internal route disclosure)
router.get('/', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7).trim();
      const decoded = jwt.verify(token, JWT_SECRET);
      if ((decoded.role || '').toUpperCase() === 'ADMIN') {
        return res.json({
          success: true,
          message: 'CoreBanking Sandbox API',
          version: '1.0.0',
          status: 'online',
          endpoints: {
            auth: '/api/auth',
            customers: '/api/customers',
            accounts: '/api/accounts',
            transactions: '/api/transactions',
            dashboard: '/api/dashboard',
            admin: '/api/admin'
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Non-sensitive minimal public status
  res.json({
    success: true,
    message: 'CoreBanking Sandbox API',
    status: 'online'
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Feature routes (Protected by authentication in their respective routers)
router.use('/customers', customerRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
