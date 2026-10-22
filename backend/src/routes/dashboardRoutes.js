const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Protect dashboard route with JWT authentication
router.use(authenticateToken);

// GET /api/dashboard - Get dashboard metrics
router.get('/', dashboardController.getMetrics);

module.exports = router;
