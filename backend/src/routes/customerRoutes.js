const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// GET /api/customers - List all customers
router.get('/', customerController.getAll);

// GET /api/customers/:id - Get customer by ID
router.get('/:id', customerController.getById);

// POST /api/customers - Create customer
router.post('/', customerController.create);

// PUT /api/customers/:id - Update customer
router.put('/:id', customerController.update);

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', customerController.remove);

// GET /api/customers/:id/accounts - Get customer's accounts
router.get('/:id/accounts', customerController.getAccounts);

module.exports = router;
