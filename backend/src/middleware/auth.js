const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const accountService = require('../services/accountService');

/**
 * Authentication Middleware
 * Validates JWT Bearer token on protected routes.
 * If token is missing, responds with HTTP 401:
 * { "success": false, "message": "Authentication token required" }
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : (req.headers['x-auth-token'] || null);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token'
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * Requires user to have one of the specified roles (e.g. ['ADMIN'])
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const hasRole = allowedRoles.some((r) => r.toUpperCase() === userRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges'
      });
    }

    next();
  };
};

/**
 * IDOR Protection Middleware for Accounts
 * Ensures that non-admin users can only view or transact on their own accounts.
 */
const authorizeAccountAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required'
    });
  }

  const userRole = (req.user.role || '').toUpperCase();
  // Admins and sandbox developers have global view across accounts
  if (userRole === 'ADMIN' || userRole === 'DEVELOPER') {
    return next();
  }

  // Extract account identifier from params or body
  const accountId = req.params.accountId || req.params.id || req.body.accountId || req.body.fromAccountId;
  if (!accountId) {
    return next();
  }

  try {
    const account = await accountService.getAccountById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: `Account '${accountId}' not found`
      });
    }

    const userCustomerId = req.user.customerId || req.user.id;
    if (account.customerId !== userCustomerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this resource'
      });
    }

    // If transfer destination is also specified by customer, ensure they aren't spoofing
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * IDOR Protection Middleware for Customers
 * Ensures that a customer can only view or modify their own customer record.
 */
const authorizeCustomerAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required'
    });
  }

  const userRole = (req.user.role || '').toUpperCase();
  if (userRole === 'ADMIN' || userRole === 'DEVELOPER') {
    return next();
  }

  const customerId = req.params.id;
  const userCustomerId = req.user.customerId || req.user.id;

  if (customerId && customerId !== userCustomerId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You do not have permission to access this resource'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  authorizeAccountAccess,
  authorizeCustomerAccess
};
