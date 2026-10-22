/**
 * CoreBanking Sandbox - Backend Entry Point
 */

try {
  // Optional dotenv loading if installed
  require('dotenv').config();
} catch (e) {
  // dotenv is optional in this setup
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const { PORT, NODE_ENV, DEFAULT_ALLOWED_ORIGINS } = require('./config');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const { initDatabase } = require('./models/schema');

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare) for rate limiting & secure cookies/headers
app.set('trust proxy', 1);

// 1. HTTP Security Headers & Anti-Fingerprinting (OWASP Compliant)
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://corebanking-sandbox.onrender.com',
          'http://localhost:5000',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5000'
        ],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    frameguard: {
      action: 'deny'
    },
    noSniff: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  })
);

// 2. Harden CORS Configuration - Strictly restricted to trusted frontend origins
const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS];
if (process.env.FRONTEND_URL) {
  const custom = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(custom)) {
    allowedOrigins.push(custom);
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token', 'x-role']
  })
);

// 3. Body Parsers with Strict Size Limits (DoS / Memory Exhaustion Protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. HTTP Parameter Pollution (HPP) Protection
app.use(hpp());

// Request Logging
app.use(requestLogger);

// API Routes
app.use('/api', routes);

// Serve Frontend Static Files in Production
const path = require('path');
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback for frontend routes (except /api)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

// 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

// Start Server if executed directly
if (require.main === module) {
  initDatabase()
    .catch((err) => {
      console.error('Failed to initialize database on startup:', err.message);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log('================================================');
        console.log(` CoreBanking Sandbox API`);
        console.log(` Server listening on: http://localhost:${PORT}`);
        console.log(` Environment: ${NODE_ENV}`);
        console.log(` API Base URL: http://localhost:${PORT}/api`);
        console.log('================================================');
      });
    });
}

module.exports = app;
