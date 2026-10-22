const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Helper to generate unique identifier using uuid v4
 */
const generateId = () => uuidv4();

/**
 * Helper to get current timestamp as ISO string
 */
const getTimestamp = () => new Date().toISOString();

/**
 * Helper to calculate SHA256 hash for ledger chaining
 */
const calculateHash = (prevHash, txnData) => {
  const content = `${prevHash || 'GENESIS'}|${txnData.id}|${txnData.accountId}|${txnData.amount}|${txnData.type}|${txnData.direction}|${txnData.timestamp}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

const getSeedData = () => {
  const customers = [
    {
      id: 'CUST-001',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@example.com',
      phone: '9876543210',
      address: '123 MG Road, Mumbai',
      dateOfBirth: '1990-05-15',
      createdAt: '2026-01-10T09:00:00.000Z'
    },
    {
      id: 'CUST-002',
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'priya.patel@example.com',
      phone: '9876543211',
      address: '456 Park Street, Delhi',
      dateOfBirth: '1988-11-22',
      createdAt: '2026-01-12T10:30:00.000Z'
    },
    {
      id: 'CUST-003',
      firstName: 'Amit',
      lastName: 'Kumar',
      email: 'amit.kumar@example.com',
      phone: '9876543212',
      address: '789 Lake View, Bangalore',
      dateOfBirth: '1995-03-08',
      createdAt: '2026-01-15T14:15:00.000Z'
    }
  ];

  // Note: ACC-002 has overdraftEnabled: true with limit 50,000 as per PRD requirement
  const accounts = [
    {
      id: 'ACC-001',
      customerId: 'CUST-001',
      accountNumber: '1001000001',
      accountType: 'savings',
      balance: 50000.00,
      overdraftEnabled: false,
      overdraftLimit: 0.00,
      status: 'active',
      createdAt: '2026-01-10T09:30:00.000Z'
    },
    {
      id: 'ACC-002',
      customerId: 'CUST-001',
      accountNumber: '1001000002',
      accountType: 'current',
      balance: 150000.00,
      overdraftEnabled: true,
      overdraftLimit: 50000.00,
      status: 'active',
      createdAt: '2026-01-11T11:00:00.000Z'
    },
    {
      id: 'ACC-003',
      customerId: 'CUST-002',
      accountNumber: '1001000003',
      accountType: 'savings',
      balance: 75000.00,
      overdraftEnabled: false,
      overdraftLimit: 0.00,
      status: 'active',
      createdAt: '2026-01-12T11:00:00.000Z'
    },
    {
      id: 'ACC-004',
      customerId: 'CUST-003',
      accountNumber: '1001000004',
      accountType: 'savings',
      balance: 25000.00,
      overdraftEnabled: false,
      overdraftLimit: 0.00,
      status: 'active',
      createdAt: '2026-01-15T15:00:00.000Z'
    },
    {
      id: 'ACC-005',
      customerId: 'CUST-002',
      accountNumber: '1001000005',
      accountType: 'current',
      balance: 10000.00,
      overdraftEnabled: false,
      overdraftLimit: 0.00,
      status: 'active',
      createdAt: '2026-01-16T12:00:00.000Z'
    }
  ];

  const rawTxns = [
    {
      id: 'TXN-001',
      transferId: null,
      accountId: 'ACC-001',
      accountNumber: '1001000001',
      type: 'deposit',
      direction: 'credit',
      amount: 60000.00,
      balance: 60000.00,
      description: 'Initial account opening deposit',
      referenceId: null,
      timestamp: '2026-01-10T09:35:00.000Z'
    },
    {
      id: 'TXN-002',
      transferId: null,
      accountId: 'ACC-001',
      accountNumber: '1001000001',
      type: 'withdrawal',
      direction: 'debit',
      amount: 10000.00,
      balance: 50000.00,
      description: 'ATM cash withdrawal',
      referenceId: null,
      timestamp: '2026-01-14T14:20:00.000Z'
    },
    {
      id: 'TXN-003',
      transferId: null,
      accountId: 'ACC-002',
      accountNumber: '1001000002',
      type: 'deposit',
      direction: 'credit',
      amount: 200000.00,
      balance: 200000.00,
      description: 'Business invoice payment deposit',
      referenceId: null,
      timestamp: '2026-01-11T11:15:00.000Z'
    },
    {
      id: 'TXN-004',
      transferId: null,
      accountId: 'ACC-002',
      accountNumber: '1001000002',
      type: 'withdrawal',
      direction: 'debit',
      amount: 50000.00,
      balance: 150000.00,
      description: 'Vendor payment - Office equipment',
      referenceId: null,
      timestamp: '2026-01-16T16:45:00.000Z'
    },
    {
      id: 'TXN-005',
      transferId: null,
      accountId: 'ACC-003',
      accountNumber: '1001000003',
      type: 'deposit',
      direction: 'credit',
      amount: 70000.00,
      balance: 70000.00,
      description: 'Initial account opening deposit',
      referenceId: null,
      timestamp: '2026-01-12T11:05:00.000Z'
    },
    {
      id: 'TXN-006',
      transferId: null,
      accountId: 'ACC-004',
      accountNumber: '1001000004',
      type: 'deposit',
      direction: 'credit',
      amount: 30000.00,
      balance: 30000.00,
      description: 'Initial savings deposit',
      referenceId: null,
      timestamp: '2026-01-15T15:05:00.000Z'
    },
    {
      id: 'TXN-007',
      transferId: 'TRF-001',
      accountId: 'ACC-004',
      accountNumber: '1001000004',
      type: 'transfer',
      direction: 'debit',
      amount: 5000.00,
      balance: 25000.00,
      description: 'Transfer to ACC-003 (Priya Patel)',
      referenceId: 'ACC-003',
      timestamp: '2026-01-18T10:10:00.000Z'
    },
    {
      id: 'TXN-008',
      transferId: 'TRF-001',
      accountId: 'ACC-003',
      accountNumber: '1001000003',
      type: 'transfer',
      direction: 'credit',
      amount: 5000.00,
      balance: 75000.00,
      description: 'Transfer from ACC-004 (Amit Kumar)',
      referenceId: 'ACC-004',
      timestamp: '2026-01-18T10:10:00.000Z'
    },
    {
      id: 'TXN-009',
      transferId: null,
      accountId: 'ACC-005',
      accountNumber: '1001000005',
      type: 'deposit',
      direction: 'credit',
      amount: 10000.00,
      balance: 10000.00,
      description: 'Initial account opening deposit',
      referenceId: null,
      timestamp: '2026-01-16T12:05:00.000Z'
    }
  ];

  // Hash chaining for transactions
  let prevHash = 'GENESIS';
  const transactions = rawTxns.map((t) => {
    const hash = calculateHash(prevHash, t);
    const item = { ...t, prevHash, hash };
    prevHash = hash;
    return item;
  });

  return { customers, accounts, transactions };
};

const initialData = getSeedData();

/**
 * In-memory Central Store
 */
const store = {
  customers: [...initialData.customers],
  accounts: [...initialData.accounts],
  transactions: [...initialData.transactions],

  reset() {
    const fresh = getSeedData();
    this.customers = [...fresh.customers];
    this.accounts = [...fresh.accounts];
    this.transactions = [...fresh.transactions];
  },

  generateId,
  getTimestamp,
  calculateHash
};

module.exports = store;
