const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken, authorizeAccountAccess } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

// Protect all transaction routes with JWT authentication
router.use(authenticateToken);

// GET /api/transactions - List all transactions (supports query filters)
router.get('/', transactionController.getAll);

// GET /api/transactions/account/:accountId - Get transactions by account (IDOR protected)
router.get('/account/:accountId', authorizeAccountAccess, transactionController.getByAccount);

// GET /api/transactions/statement/:accountId - Get full account statement with running balance (IDOR protected)
router.get('/statement/:accountId', authorizeAccountAccess, transactionController.getStatement);

// POST /api/transactions/deposit - Make deposit (Rate limited + IDOR protected)
router.post('/deposit', sensitiveLimiter, authorizeAccountAccess, transactionController.deposit);

// POST /api/transactions/withdraw - Make withdrawal (Rate limited + IDOR protected)
router.post('/withdraw', sensitiveLimiter, authorizeAccountAccess, transactionController.withdraw);

// POST /api/transactions/transfer - Make transfer (Rate limited + IDOR protected)
router.post('/transfer', sensitiveLimiter, authorizeAccountAccess, transactionController.transfer);

module.exports = router;
