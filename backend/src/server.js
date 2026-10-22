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
const { PORT, NODE_ENV } = require('./config');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Enable CORS - explicitly allow localhost:5173 and development tools
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman or curl) or local dev servers
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(requestLogger);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CoreBanking Sandbox API',
    documentation: '/api',
    status: 'online'
  });
});

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
  app.listen(PORT, () => {
    console.log('================================================');
    console.log(` CoreBanking Sandbox API`);
    console.log(` Server listening on: http://localhost:${PORT}`);
    console.log(` Environment: ${NODE_ENV}`);
    console.log(` API Base URL: http://localhost:${PORT}/api`);
    console.log('================================================');
  });
}

module.exports = app;
