const db = require('../config/db');

const initDatabase = async () => {
  if (!db.isDbConnected()) {
    console.log('ℹ️ DATABASE_URL not set; using in-memory store.');
    return;
  }

  try {
    console.log('🔄 Initializing PostgreSQL database schema on Neon...');
    
    // 1. Customers Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT,
        date_of_birth DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Accounts Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        account_type VARCHAR(20) NOT NULL,
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        overdraft_enabled BOOLEAN DEFAULT FALSE,
        overdraft_limit NUMERIC(15, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Transactions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        account_number VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        balance NUMERIC(15, 2) NOT NULL,
        description TEXT,
        reference_id VARCHAR(50),
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        prev_hash TEXT DEFAULT 'GENESIS',
        hash TEXT
      );
    `);

    console.log('✅ PostgreSQL Schema initialized successfully on Neon.');

    // Seed if empty
    const custCountRes = await db.query('SELECT COUNT(*) FROM customers');
    if (parseInt(custCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial demo customers & accounts into PostgreSQL...');
      
      // Seed Customers
      await db.query(`
        INSERT INTO customers (id, first_name, last_name, email, phone, address, date_of_birth, created_at)
        VALUES
          ('CUST-001', 'Rahul', 'Sharma', 'rahul.sharma@example.com', '9876543210', '123 MG Road, Mumbai', '1990-05-15', '2026-01-10T09:00:00.000Z'),
          ('CUST-002', 'Priya', 'Patel', 'priya.patel@example.com', '9876543211', '456 Park Street, Delhi', '1988-11-22', '2026-01-12T10:30:00.000Z'),
          ('CUST-003', 'Amit', 'Kumar', 'amit.kumar@example.com', '9876543212', '789 Lake View, Bangalore', '1995-03-08', '2026-01-15T14:15:00.000Z')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Seed Accounts
      await db.query(`
        INSERT INTO accounts (id, customer_id, account_number, account_type, balance, overdraft_enabled, overdraft_limit, status, created_at)
        VALUES
          ('ACC-001', 'CUST-001', '1001000001', 'savings', 50000.00, FALSE, 0.00, 'active', '2026-01-10T09:30:00.000Z'),
          ('ACC-002', 'CUST-001', '1001000002', 'current', 150000.00, TRUE, 50000.00, 'active', '2026-01-11T11:00:00.000Z'),
          ('ACC-003', 'CUST-002', '1001000003', 'savings', 75000.00, FALSE, 0.00, 'active', '2026-01-12T11:00:00.000Z'),
          ('ACC-004', 'CUST-003', '1001000004', 'savings', 25000.00, FALSE, 0.00, 'active', '2026-01-15T15:00:00.000Z')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Seed Transactions
      await db.query(`
        INSERT INTO transactions (id, account_id, account_number, type, direction, amount, balance, description, reference_id, timestamp, prev_hash, hash)
        VALUES
          ('TXN-001', 'ACC-001', '1001000001', 'deposit', 'credit', 60000.00, 60000.00, 'Initial account opening deposit', NULL, '2026-01-10T09:35:00.000Z', 'GENESIS', 'd42b9ad5682050647f8f4f649e596e89ff744d834a734d7691b49659c6ac1956'),
          ('TXN-002', 'ACC-001', '1001000001', 'withdrawal', 'debit', 10000.00, 50000.00, 'ATM cash withdrawal', NULL, '2026-01-14T14:20:00.000Z', 'd42b9ad5682050647f8f4f649e596e89ff744d834a734d7691b49659c6ac1956', 'f9bfb4c219a5f4571e9e83e1615da9b723ac13cb6db8007b63e46ccf042528e4'),
          ('TXN-003', 'ACC-002', '1001000002', 'deposit', 'credit', 200000.00, 200000.00, 'Business invoice payment deposit', NULL, '2026-01-11T11:15:00.000Z', 'f9bfb4c219a5f4571e9e83e1615da9b723ac13cb6db8007b63e46ccf042528e4', '4c587dc9ae2c130520a2f679b582e6631e09d358f1221cbb6abf9da0d6d3e073'),
          ('TXN-004', 'ACC-002', '1001000002', 'withdrawal', 'debit', 50000.00, 150000.00, 'Vendor payment - Office equipment', NULL, '2026-01-16T16:45:00.000Z', '4c587dc9ae2c130520a2f679b582e6631e09d358f1221cbb6abf9da0d6d3e073', '0843abe58bdda657eadb7b14b5ef45719434c065b54c4852b081814ce2184301'),
          ('TXN-005', 'ACC-003', '1001000003', 'deposit', 'credit', 70000.00, 70000.00, 'Initial account opening deposit', NULL, '2026-01-12T11:05:00.000Z', '0843abe58bdda657eadb7b14b5ef45719434c065b54c4852b081814ce2184301', 'a93f9ba2dd9d344f01b6976628f58512047e65d6a7dedc84457ce969152f0cff'),
          ('TXN-006', 'ACC-004', '1001000004', 'deposit', 'credit', 30000.00, 30000.00, 'Initial savings deposit', NULL, '2026-01-15T15:05:00.000Z', 'a93f9ba2dd9d344f01b6976628f58512047e65d6a7dedc84457ce969152f0cff', '107372e3963202500f297388fb1e88e63744e2eab1a92b873533b7af9824259e'),
          ('TXN-007', 'ACC-004', '1001000004', 'transfer', 'debit', 5000.00, 25000.00, 'Transfer to ACC-003 (Priya Patel)', 'ACC-003', '2026-01-18T10:10:00.000Z', '107372e3963202500f297388fb1e88e63744e2eab1a92b873533b7af9824259e', '65c3a242c7a5229c035d358fec7ee8cf05b521e09e44ff9ff2e8cef8fc3d6a86'),
          ('TXN-008', 'ACC-003', '1001000003', 'transfer', 'credit', 5000.00, 75000.00, 'Transfer from ACC-004 (Amit Kumar)', 'ACC-004', '2026-01-18T10:10:00.000Z', '65c3a242c7a5229c035d358fec7ee8cf05b521e09e44ff9ff2e8cef8fc3d6a86', '6e7096f4d495ba133084012f003d48e6cf05e127308a21ac015fb4decb93660d')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Demo seed data populated in PostgreSQL.');
    }
  } catch (err) {
    console.error('❌ PostgreSQL schema initialization error:', err.message);
  }
};

module.exports = { initDatabase };
