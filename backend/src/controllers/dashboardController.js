const dashboardService = require('../services/dashboardService');
const { successResponse } = require('../utils/response');

/**
 * Controller for Dashboard Analytics & Metrics
 */

const getMetrics = async (req, res, next) => {
  try {
    const metrics = await dashboardService.getDashboardMetrics();
    return successResponse(res, metrics, 'Dashboard metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMetrics
};
