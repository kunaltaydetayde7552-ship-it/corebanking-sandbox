const http = require('http');
const app = require('../src/server');

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json || data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}...`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    console.log('\n--- AREA 1: HTTP Security Headers & Anti-Fingerprinting ---');
    const rootRes = await request('/api');
    assert(!rootRes.headers['x-powered-by'], 'X-Powered-By header is removed');
    assert(rootRes.headers['x-frame-options'] === 'DENY', 'X-Frame-Options is DENY (anti-clickjacking)');
    assert(rootRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(
      rootRes.headers['strict-transport-security'] &&
        rootRes.headers['strict-transport-security'].includes('max-age=31536000'),
      'Strict-Transport-Security (HSTS) is enabled with maxAge: 31536000'
    );
    assert(
      rootRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
      'Referrer-Policy is strict-origin-when-cross-origin'
    );
    assert(
      rootRes.headers['content-security-policy'] &&
        rootRes.headers['content-security-policy'].includes("default-src 'self'"),
      'Content-Security-Policy (CSP) is properly configured'
    );

    console.log('\n--- AREA 2 & 3: API Root Discovery Sanitization ---');
    assert(
      rootRes.body && rootRes.body.status === 'online' && !rootRes.body.endpoints,
      'Unauthenticated GET /api does NOT expose internal route directory'
    );

    console.log('\n--- AREA 2: Authentication Protection on Financial Routes ---');
    const unauthAccounts = await request('/api/accounts');
    assert(
      unauthAccounts.statusCode === 401 &&
        unauthAccounts.body.success === false &&
        unauthAccounts.body.message === 'Authentication token required',
      'Unauthenticated GET /api/accounts returns 401 "Authentication token required"'
    );

    const unauthCustomers = await request('/api/customers');
    assert(
      unauthCustomers.statusCode === 401 &&
        unauthCustomers.body.message === 'Authentication token required',
      'Unauthenticated GET /api/customers returns 401 "Authentication token required"'
    );

    const unauthTransactions = await request('/api/transactions');
    assert(
      unauthTransactions.statusCode === 401 &&
        unauthTransactions.body.message === 'Authentication token required',
      'Unauthenticated GET /api/transactions returns 401 "Authentication token required"'
    );

    const unauthDashboard = await request('/api/dashboard');
    assert(
      unauthDashboard.statusCode === 401 &&
        unauthDashboard.body.message === 'Authentication token required',
      'Unauthenticated GET /api/dashboard returns 401 "Authentication token required"'
    );

    const unauthAdmin = await request('/api/admin/reset', { method: 'POST' });
    assert(
      unauthAdmin.statusCode === 401 &&
        unauthAdmin.body.message === 'Authentication token required',
      'Unauthenticated POST /api/admin/reset returns 401 "Authentication token required"'
    );

    console.log('\n--- AREA 2: Token Generation & Authenticated Access ---');
    const tokenRes = await request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'DEVELOPER' }
    });
    assert(tokenRes.statusCode === 200 && tokenRes.body.token, 'POST /api/auth/token generates valid JWT');
    const devToken = tokenRes.body.token;

    const authAccounts = await request('/api/accounts', {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    assert(
      authAccounts.statusCode === 200 && authAccounts.body.success === true,
      'Authenticated GET /api/accounts with Bearer token succeeds (200 OK)'
    );

    console.log('\n--- AREA 2: IDOR (Insecure Direct Object Reference) Protection ---');
    // Issue token for Customer CUST-001
    const cust1TokenRes = await request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'CUSTOMER', customerId: 'CUST-001' }
    });
    const cust1Token = cust1TokenRes.body.token;

    // Try to access ACC-003 (owned by Priya Patel CUST-002)
    const idorRes = await request('/api/accounts/ACC-003', {
      headers: { Authorization: `Bearer ${cust1Token}` }
    });
    assert(
      idorRes.statusCode === 403 &&
        idorRes.body.success === false &&
        idorRes.body.message.includes('Access denied'),
      'IDOR Protection: Customer CUST-001 blocked from accessing ACC-003 (owned by CUST-002) -> 403 Forbidden'
    );

    // Try to access Customer profile CUST-002
    const idorCustRes = await request('/api/customers/CUST-002', {
      headers: { Authorization: `Bearer ${cust1Token}` }
    });
    assert(
      idorCustRes.statusCode === 403 &&
        idorCustRes.body.success === false &&
        idorCustRes.body.message.includes('Access denied'),
      'IDOR Protection: Customer CUST-001 blocked from accessing CUST-002 profile -> 403 Forbidden'
    );

    console.log('\n--- AREA 4: CORS Hardening ---');
    const corsGood = await request('/api/health', {
      headers: { Origin: 'https://corebanking-sandbox.onrender.com' }
    });
    assert(
      corsGood.headers['access-control-allow-origin'] === 'https://corebanking-sandbox.onrender.com',
      'CORS: Trusted Render domain is allowed'
    );

    const corsBad = await request('/api/health', {
      headers: { Origin: 'https://malicious-phishing-site.com' }
    });
    assert(
      corsBad.statusCode === 403 || !corsBad.headers['access-control-allow-origin'],
      'CORS: Untrusted origin is rejected/blocked'
    );

    console.log('\n--- AREA 4: Rate Limiting Headers ---');
    assert(
      rootRes.headers['ratelimit-limit'] !== undefined,
      'Rate limiting headers (RateLimit-Limit) present on responses'
    );

    console.log('\n=============================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('=============================================\n');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
