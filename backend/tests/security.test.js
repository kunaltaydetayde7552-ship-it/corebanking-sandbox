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

    console.log('\n--- AREA 2: Admin Authentication Fallback Bypass Closure ---');
    // 1. Attempt to bypass login with just role: ADMIN
    const bypassLoginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'ADMIN' }
    });
    assert(
      bypassLoginRes.statusCode === 401,
      'POST /api/auth/login with { role: "ADMIN" } and no credentials rejected (401 Unauthorized)'
    );

    // 2. Attempt to bypass /token with just role: ADMIN and no password
    const bypassTokenRes = await request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'ADMIN' }
    });
    assert(
      bypassTokenRes.statusCode === 401 &&
        bypassTokenRes.body.message &&
        bypassTokenRes.body.message.includes('Admin credentials required'),
      'POST /api/auth/token with { role: "ADMIN" } without password rejected (401 Unauthorized)'
    );

    // 3. Attempt with wrong password
    const wrongAdminRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@corebanking.com', password: 'wrongpassword' }
    });
    assert(
      wrongAdminRes.statusCode === 401,
      'POST /api/auth/login with invalid admin password rejected (401 Unauthorized)'
    );

    // 4. Legitimate verified admin login
    const legitAdminRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@corebanking.com', password: 'admin123' }
    });
    assert(
      legitAdminRes.statusCode === 200 &&
        legitAdminRes.body.user &&
        legitAdminRes.body.user.role === 'ADMIN',
      'POST /api/auth/login with valid credentials successfully returns verified ADMIN token'
    );

    // 5. Verified admin session token
    const legitAdminTokenRes = await request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'ADMIN', password: 'admin123' }
    });
    assert(
      legitAdminTokenRes.statusCode === 200 &&
        legitAdminTokenRes.body.user &&
        legitAdminTokenRes.body.user.role === 'ADMIN',
      'POST /api/auth/token with verified password returns ADMIN session token'
    );

    console.log('\n--- AREA 3: HTTP Parameter Pollution (HPP) & Body Parser Limits ---');
    // HPP test: polluted array parameters should be sanitized without crash
    const hppRes = await request('/api/transactions?type=deposit&type=withdrawal', {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    assert(
      hppRes.statusCode === 200 && hppRes.body.success === true,
      'HPP: Polluted query parameters handled safely without 500 crashes'
    );

    // Body limit test: payload larger than 10kb should be rejected with 413 Payload Too Large
    const largePayload = { dummy: 'X'.repeat(12 * 1024) }; // ~12kb
    const largeRes = await request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largePayload
    });
    assert(
      largeRes.statusCode === 413,
      'DoS Protection: Payload exceeding 10kb rejected with HTTP 413 Payload Too Large'
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

    console.log('\n--- PRD PST_PD_153 COMPLIANCE & SECURITY HARDENING ---');
    // 1. Admin Overdraft & Status Protection (US-05, US-09, Section 17)
    const devOverdraftRes = await request('/api/accounts/ACC-001/overdraft', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`
      },
      body: { overdraftEnabled: true, overdraftLimit: 25000 }
    });
    assert(
      devOverdraftRes.statusCode === 403 &&
        devOverdraftRes.body.message === 'Unauthorized: Only Admin can modify overdraft settings and account limits.',
      'Developer role blocked from PATCH /api/accounts/:id/overdraft (403 Forbidden with exact message)'
    );

    const devStatusRes = await request('/api/accounts/ACC-001/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`
      },
      body: { status: 'frozen' }
    });
    assert(
      devStatusRes.statusCode === 403 &&
        devStatusRes.body.message === 'Unauthorized: Only Admin can modify overdraft settings and account limits.',
      'Developer role blocked from PATCH /api/accounts/:id/status (403 Forbidden with exact message)'
    );

    // Admin allowed to update overdraft
    const adminToken = legitAdminTokenRes.body.token;
    const adminOverdraftRes = await request('/api/accounts/ACC-001/overdraft', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: { overdraftEnabled: false, overdraftLimit: 0 }
    });
    assert(
      adminOverdraftRes.statusCode === 200 && adminOverdraftRes.body.success === true,
      'Admin role permitted to PATCH /api/accounts/:id/overdraft (200 OK)'
    );

    // 2. Real Database & Store Reset (US-08)
    const resetRes = await request('/api/admin/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      resetRes.statusCode === 200 &&
        resetRes.body.success === true &&
        resetRes.body.data.totalAccounts === 5,
      'POST /api/admin/reset re-seeds exact 5 sample accounts and transactions (200 OK)'
    );

    // 3. Fractional Underflow & Minimum Amount Validation (Money Rule: amount >= 0.01)
    const underflowDeposit = await request('/api/transactions/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: { accountId: 'ACC-001', amount: 0.001, description: 'Underflow test' }
    });
    assert(
      underflowDeposit.statusCode === 400 &&
        underflowDeposit.body.message === 'Enter an amount greater than ₹0.00.',
      'Deposit with fractional underflow (0.001) rejected with "Enter an amount greater than ₹0.00."'
    );

    const underflowWithdraw = await request('/api/transactions/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: { accountId: 'ACC-001', amount: 0.0001, description: 'Underflow test' }
    });
    assert(
      underflowWithdraw.statusCode === 400 &&
        underflowWithdraw.body.message === 'Enter an amount greater than ₹0.00.',
      'Withdrawal with fractional underflow (0.0001) rejected with "Enter an amount greater than ₹0.00."'
    );

    const underflowTransfer = await request('/api/transactions/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: { fromAccountId: 'ACC-001', toAccountId: 'ACC-002', amount: 0.004, description: 'Underflow test' }
    });
    assert(
      underflowTransfer.statusCode === 400 &&
        underflowTransfer.body.message === 'Enter an amount greater than ₹0.00.',
      'Transfer with fractional underflow (0.004) rejected with "Enter an amount greater than ₹0.00."'
    );

    // 4. Linked Debit & Credit Entries with matching transferId (US-03 & Section 10)
    const validTransfer = await request('/api/transactions/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: { fromAccountId: 'ACC-001', toAccountId: 'ACC-002', amount: 500, description: 'Audit link test' }
    });
    assert(
      validTransfer.statusCode === 201 &&
        validTransfer.body.success === true &&
        validTransfer.body.data.transferId &&
        validTransfer.body.data.transferDebit.transferId === validTransfer.body.data.transferId &&
        validTransfer.body.data.transferCredit.transferId === validTransfer.body.data.transferId,
      'Transfer generates linked transferId matching across both debit and credit entries'
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
