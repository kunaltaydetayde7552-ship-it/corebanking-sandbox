const express = require('express');
const router = express.Router();

const customerRoutes = require('./customerRoutes');
const accountRoutes = require('./accountRoutes');
const transactionRoutes = require('./transactionRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const adminRoutes = require('./adminRoutes');

// API Health Check & Root Info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CoreBanking Sandbox API is running',
    version: '1.0.0',
    endpoints: {
      customers: '/api/customers',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      dashboard: '/api/dashboard',
      admin: '/api/admin'
    }
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Feature routes
router.use('/customers', customerRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
