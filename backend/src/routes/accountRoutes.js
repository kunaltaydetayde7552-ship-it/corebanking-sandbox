const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// GET /api/accounts - List all accounts
router.get('/', accountController.getAll);

// GET /api/accounts/:id - Get account by ID
router.get('/:id', accountController.getById);

// POST /api/accounts - Create account
router.post('/', accountController.create);

// PATCH /api/accounts/:id/status - Update account status
router.patch('/:id/status', accountController.updateStatus);

// PATCH /api/accounts/:id/overdraft - Update overdraft settings
router.patch('/:id/overdraft', accountController.updateOverdraft);

// GET /api/accounts/:id/balance - Get account balance
router.get('/:id/balance', accountController.getBalance);

module.exports = router;
