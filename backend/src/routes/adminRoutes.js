const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { successResponse } = require('../utils/response');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

// Protect all admin routes with JWT authentication and require ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

/**
 * POST /api/admin/reset
 * Resets in-memory store back to documented sample accounts and transactions
 */
router.post('/reset', sensitiveLimiter, (req, res, next) => {
  try {
    store.reset();
    return successResponse(
      res,
      {
        totalCustomers: store.customers.length,
        totalAccounts: store.accounts.length,
        totalTransactions: store.transactions.length
      },
      'Sandbox data successfully reset to clean sample state.'
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
