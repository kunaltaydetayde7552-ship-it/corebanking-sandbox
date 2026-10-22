const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, authorizeCustomerAccess, requireRole } = require('../middleware/auth');

// Protect all customer routes with JWT authentication
router.use(authenticateToken);

// GET /api/customers - List customers (scoped to user if CUSTOMER role, else all)
router.get('/', customerController.getAll);

// GET /api/customers/:id - Get customer by ID (IDOR protected)
router.get('/:id', authorizeCustomerAccess, customerController.getById);

// POST /api/customers - Create customer
router.post('/', customerController.create);

// PUT /api/customers/:id - Update customer (IDOR protected)
router.put('/:id', authorizeCustomerAccess, customerController.update);

// DELETE /api/customers/:id - Delete customer (Admin only)
router.delete('/:id', requireRole(['ADMIN']), customerController.remove);

// GET /api/customers/:id/accounts - Get customer's accounts (IDOR protected)
router.get('/:id/accounts', authorizeCustomerAccess, customerController.getAccounts);

module.exports = router;
