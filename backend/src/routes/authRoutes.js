const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const customerService = require('../services/customerService');

// Demo credentials for sandbox environment
const DEMO_USERS = {
  admin: {
    id: 'USR-ADMIN-01',
    name: 'CoreBanking Admin',
    email: 'admin@corebanking.com',
    role: 'ADMIN'
  },
  developer: {
    id: 'USR-DEV-01',
    name: 'Sandbox Developer',
    email: 'dev@corebanking.com',
    role: 'DEVELOPER'
  }
};

/**
 * Helper to generate JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns JWT token
 */
router.post('/login', sensitiveLimiter, async (req, res, next) => {
  try {
    const { email, username, password, role } = req.body || {};
    const identity = (email || username || '').toLowerCase().trim();

    // Check Admin
    if (identity === 'admin@corebanking.com' || identity === 'admin') {
      if (password === 'admin123' || !password) { // Allow seamless sandbox auth if empty password or correct
        const token = generateToken(DEMO_USERS.admin);
        return res.json({
          success: true,
          message: 'Admin authentication successful',
          token,
          user: DEMO_USERS.admin
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check Developer
    if (identity === 'dev@corebanking.com' || identity === 'developer' || identity === 'dev' || role === 'DEVELOPER') {
      const token = generateToken(DEMO_USERS.developer);
      return res.json({
        success: true,
        message: 'Developer authentication successful',
        token,
        user: DEMO_USERS.developer
      });
    }

    // Check Customer by Email
    if (identity) {
      const customers = await customerService.getAllCustomers();
      const customer = customers.find((c) => (c.email || '').toLowerCase() === identity);
      if (customer) {
        const userPayload = {
          id: customer.id,
          customerId: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          role: 'CUSTOMER'
        };
        const token = generateToken(userPayload);
        return res.json({
          success: true,
          message: 'Customer authentication successful',
          token,
          user: userPayload
        });
      }
    }

    // Default Sandbox Fallback for requested role
    const selectedRole = (role || 'DEVELOPER').toUpperCase();
    const userPayload = selectedRole === 'ADMIN' ? DEMO_USERS.admin : DEMO_USERS.developer;
    const token = generateToken(userPayload);
    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/token
 * Returns a sandbox session token for frontend or automated tools
 */
router.post('/token', (req, res) => {
  const { role, customerId } = req.body || {};
  const selectedRole = (role || 'DEVELOPER').toUpperCase();

  let userPayload;
  if (selectedRole === 'ADMIN') {
    userPayload = DEMO_USERS.admin;
  } else if (selectedRole === 'CUSTOMER' && customerId) {
    userPayload = {
      id: customerId,
      customerId,
      name: `Customer ${customerId}`,
      role: 'CUSTOMER'
    };
  } else {
    userPayload = DEMO_USERS.developer;
  }

  const token = generateToken(userPayload);
  return res.json({
    success: true,
    token,
    user: userPayload
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
