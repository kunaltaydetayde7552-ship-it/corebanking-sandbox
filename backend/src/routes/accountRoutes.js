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

// PATCH /api/accounts/:id/status - Update account status (Admin/Dev only)
router.patch('/:id/status', authorizeAccountAccess, accountController.updateStatus);

// PATCH /api/accounts/:id/overdraft - Update overdraft settings (Admin/Dev only)
router.patch('/:id/overdraft', authorizeAccountAccess, accountController.updateOverdraft);

// GET /api/accounts/:id/balance - Get account balance (IDOR protected)
router.get('/:id/balance', authorizeAccountAccess, accountController.getBalance);

module.exports = router;
