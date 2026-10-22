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
 * Authenticates user credentials with explicit verification and returns JWT token.
 * Unauthenticated fallback for ADMIN or unknown identities is strictly prohibited.
 */
router.post('/login', sensitiveLimiter, async (req, res, next) => {
  try {
    const { email, username, password } = req.body || {};
    const identity = (email || username || '').toLowerCase().trim();

    if (!identity || !password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Explicit email/username and password required.'
      });
    }

    // 1. Verify Admin Credentials
    if (identity === 'admin@corebanking.com' || identity === 'admin') {
      if (password === 'admin123') {
        const token = generateToken(DEMO_USERS.admin);
        return res.json({
          success: true,
          message: 'Admin authentication successful',
          token,
          user: DEMO_USERS.admin
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // 2. Verify Developer Credentials
    if (identity === 'dev@corebanking.com' || identity === 'developer' || identity === 'dev') {
      if (password === 'dev123') {
        const token = generateToken(DEMO_USERS.developer);
        return res.json({
          success: true,
          message: 'Developer authentication successful',
          token,
          user: DEMO_USERS.developer
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid developer credentials'
      });
    }

    // 3. Verify Customer by Email
    const customers = await customerService.getAllCustomers();
    const customer = customers.find((c) => (c.email || '').toLowerCase() === identity);
    if (customer) {
      if (password === 'customer123' || password === 'demo123') {
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
      return res.status(401).json({
        success: false,
        message: 'Invalid customer password'
      });
    }

    // 4. Reject all unknown identities
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Account not found or invalid credentials'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/token
 * Returns a sandbox session token for frontend or automated tools.
 * STRICT: Admin role requires verified admin credentials.
 */
router.post('/token', (req, res) => {
  const { role, password, customerId } = req.body || {};
  const selectedRole = (role || 'DEVELOPER').toUpperCase();

  let userPayload;
  if (selectedRole === 'ADMIN') {
    // Admin token requires explicit admin verification
    if (password !== 'admin123') {
      return res.status(401).json({
        success: false,
        message: 'Admin credentials required to issue an admin session token'
      });
    }
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
