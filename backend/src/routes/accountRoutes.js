const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken, authorizeAccountAccess } = require('../middleware/auth');

// Protect all account routes with JWT authentication
router.use(authenticateToken);

// GET /api/accounts - List accounts (scoped to customer if CUSTOMER role, else all)
router.get('/', accountController.getAll);

// GET /api/accounts/:id - Get account by ID (IDOR protected)
router.get('/:id', authorizeAccountAccess, accountController.getById);

// POST /api/accounts - Create account
router.post('/', accountController.create);

const requireAdminForOverdraft = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: Only Admin can modify overdraft settings and account limits.'
    });
  }
  next();
};

// PATCH /api/accounts/:id/status - Update account status (Admin only)
router.patch('/:id/status', requireAdminForOverdraft, accountController.updateStatus);

// PATCH /api/accounts/:id/overdraft - Update overdraft settings (Admin only)
router.patch('/:id/overdraft', requireAdminForOverdraft, accountController.updateOverdraft);

// GET /api/accounts/:id/balance - Get account balance (IDOR protected)
router.get('/:id/balance', authorizeAccountAccess, accountController.getBalance);

module.exports = router;
