const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET /api/transactions - List all transactions (supports ?accountId, ?type, ?startDate, ?endDate, ?page, ?limit)
router.get('/', transactionController.getAll);

// GET /api/transactions/account/:accountId - Get transactions by account (supports ?type, ?startDate, ?endDate, ?page, ?limit)
router.get('/account/:accountId', transactionController.getByAccount);

// GET /api/transactions/statement/:accountId - Get full account statement with running balance
router.get('/statement/:accountId', transactionController.getStatement);

// POST /api/transactions/deposit - Make deposit
router.post('/deposit', transactionController.deposit);

// POST /api/transactions/withdraw - Make withdrawal
router.post('/withdraw', transactionController.withdraw);

// POST /api/transactions/transfer - Make transfer
router.post('/transfer', transactionController.transfer);

module.exports = router;
