const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard - Get dashboard metrics
router.get('/', dashboardController.getMetrics);

module.exports = router;
