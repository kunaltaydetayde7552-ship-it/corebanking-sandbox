const db = require('../config/db');
const store = require('../models/store');
const { isPositiveNumber } = require('../utils/validators');

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const mapTxnRow = (row) => ({
  id: row.id,
  transferId: row.transfer_id || null,
  accountId: row.account_id,
  accountNumber: row.account_number,
  type: row.type,
  direction: row.direction,
  amount: parseFloat(row.amount),
  balance: parseFloat(row.balance),
  description: row.description,
  referenceId: row.reference_id,
  timestamp: row.timestamp ? (typeof row.timestamp === 'string' ? row.timestamp : row.timestamp.toISOString()) : '',
  prevHash: row.prev_hash,
  hash: row.hash
});

const generateTxnId = async () => {
  if (db.isDbConnected()) {
    const res = await db.query("SELECT id FROM transactions WHERE id ~ '^TXN-[0-9]+$'");
    let maxId = 0;
    for (const r of res.rows) {
      const match = r.id.match(/^TXN-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    return `TXN-${String(maxId + 1).padStart(3, '0')}`;
  }

  let maxId = 0;
  for (const t of store.transactions) {
    const match = t.id && t.id.match(/^TXN-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  return `TXN-${String(maxId + 1).padStart(3, '0')}`;
};

const generateTxnIdWithClient = async (client) => {
  const res = await client.query("SELECT id FROM transactions WHERE id ~ '^TXN-[0-9]+$'");
  let maxId = 0;
  for (const r of res.rows) {
    const match = r.id.match(/^TXN-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  return `TXN-${String(maxId + 1).padStart(3, '0')}`;
};

const generateTransferIdWithClient = async (client) => {
  const res = await client.query("SELECT transfer_id FROM transactions WHERE transfer_id ~ '^TRF-[0-9]+$'");
  let maxId = 0;
  for (const r of res.rows) {
    const match = r.transfer_id && r.transfer_id.match(/^TRF-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  return `TRF-${String(maxId + 1).padStart(3, '0')}`;
};

const getAllTransactions = async (filters = {}) => {
  if (db.isDbConnected()) {
    let queryText = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (filters.accountId) {
      params.push(filters.accountId);
      queryText += ` AND (account_id = $${params.length} OR account_number = $${params.length})`;
    }
    if (filters.type) {
      params.push(filters.type.toLowerCase());
      queryText += ` AND LOWER(type) = $${params.length}`;
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      queryText += ` AND timestamp >= $${params.length}`;
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      queryText += ` AND timestamp <= $${params.length}`;
    }

    queryText += ' ORDER BY timestamp DESC';
    const res = await db.query(queryText, params);
    const txns = res.rows.map(mapTxnRow);

    const total = txns.length;
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, parseInt(filters.limit, 10) || 10);
    const paged = txns.slice((page - 1) * limit, page * limit);

    return { transactions: paged, total, page, limit };
  }

  let txns = [...store.transactions];
  const { accountId, type, startDate, endDate, page = 1, limit = 10 } = filters;
  if (accountId) {
    txns = txns.filter(t => t.accountId === accountId || t.accountNumber === accountId);
  }
  if (type) {
    txns = txns.filter(t => t.type.toLowerCase() === type.toLowerCase());
  }
  txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const total = txns.length;
  const paged = txns.slice((page - 1) * limit, page * limit);
  return { transactions: paged, total, page, limit };
};

const getTransactionsByAccountId = async (accountId, filters = {}) => {
  return getAllTransactions({ ...filters, accountId });
};

const deposit = async (accountId, amount, description) => {
  if (!accountId) throw createError('accountId is required');
  if (!isPositiveNumber(amount)) throw createError('Enter an amount greater than ₹0.00.', 400);

  const numAmount = Number(Number(amount).toFixed(2));
  if (numAmount < 0.01) {
    throw createError('Enter an amount greater than ₹0.00.', 400);
  }

  if (db.isDbConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Row-level lock to prevent concurrency race conditions
      const accRes = await client.query(
        'SELECT id, account_number, balance, status FROM accounts WHERE id = $1 OR account_number = $1 FOR UPDATE',
        [accountId]
      );
      if (accRes.rows.length === 0) throw createError(`Account '${accountId}' not found`, 404);
      const account = accRes.rows[0];

      if (account.status !== 'active') {
        throw createError(`Cannot perform deposit on account with status '${account.status}'`, 400);
      }

      const newBalance = Number((parseFloat(account.balance) + numAmount).toFixed(2));
      await client.query('UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newBalance, account.id]);

      const txnId = await generateTxnIdWithClient(client);
      const lastTxnRes = await client.query('SELECT hash FROM transactions ORDER BY timestamp DESC LIMIT 1 FOR UPDATE');
      const prevHash = lastTxnRes.rows.length > 0 ? lastTxnRes.rows[0].hash : 'GENESIS';
      const txnData = {
        id: txnId,
        accountId: account.id,
        amount: numAmount,
        type: 'deposit',
        direction: 'credit',
        timestamp: new Date().toISOString()
      };
      const hash = store.calculateHash(prevHash, txnData);

      const insTxn = await client.query(`
        INSERT INTO transactions (id, transfer_id, account_id, account_number, type, direction, amount, balance, description, reference_id, prev_hash, hash)
        VALUES ($1, NULL, $2, $3, 'deposit', 'credit', $4, $5, $6, NULL, $7, $8)
        RETURNING *
      `, [txnId, account.id, account.account_number, numAmount, newBalance, description ? String(description).trim() : 'Account deposit', prevHash, hash]);

      await client.query('COMMIT');

      return {
        transaction: mapTxnRow(insTxn.rows[0]),
        account: {
          id: account.id,
          accountNumber: account.account_number,
          balance: newBalance,
          status: account.status
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // In-memory fallback
  const account = store.accounts.find(a => a.id === accountId || a.accountNumber === accountId);
  if (!account) throw createError(`Account '${accountId}' not found`, 404);
  if (account.status !== 'active') {
    throw createError(`Cannot perform deposit on account with status '${account.status}'`, 400);
  }
  account.balance = Number((account.balance + numAmount).toFixed(2));
  const txnId = `TXN-${String(store.transactions.length + 1).padStart(3, '0')}`;
  const prevHash = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';
  const txn = {
    id: txnId,
    transferId: null,
    accountId: account.id,
    accountNumber: account.accountNumber,
    type: 'deposit',
    direction: 'credit',
    amount: numAmount,
    balance: account.balance,
    description: description || 'Account deposit',
    referenceId: null,
    timestamp: store.getTimestamp()
  };
  txn.hash = store.calculateHash(prevHash, txn);
  txn.prevHash = prevHash;
  store.transactions.push(txn);
  return { transaction: txn, account };
};

const withdraw = async (accountId, amount, description) => {
  if (!accountId) throw createError('accountId is required');
  if (!isPositiveNumber(amount)) throw createError('Enter an amount greater than ₹0.00.', 400);

  const numAmount = Number(Number(amount).toFixed(2));
  if (numAmount < 0.01) {
    throw createError('Enter an amount greater than ₹0.00.', 400);
  }

  if (db.isDbConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Row-level lock: SELECT balance, status, overdraft_enabled, overdraft_limit FROM accounts WHERE id = $1 FOR UPDATE
      const accRes = await client.query(
        'SELECT id, account_number, balance, status, overdraft_enabled, overdraft_limit FROM accounts WHERE id = $1 OR account_number = $1 FOR UPDATE',
        [accountId]
      );
      if (accRes.rows.length === 0) throw createError(`Account '${accountId}' not found`, 404);
      const account = accRes.rows[0];

      if (account.status !== 'active') {
        throw createError(`Cannot perform withdrawal on account with status '${account.status}'`, 400);
      }

      const currentBal = parseFloat(account.balance);
      const odLimit = account.overdraft_enabled ? parseFloat(account.overdraft_limit || 0) : 0;
      const maxAvailable = Number((currentBal + odLimit).toFixed(2));

      if (numAmount > maxAvailable) {
        if (account.overdraft_enabled) {
          throw createError(`Withdrawal blocked. ${account.account_number} has ₹${currentBal.toFixed(2)} balance and ₹${odLimit.toFixed(2)} overdraft (Total available: ₹${maxAvailable.toFixed(2)}).`, 400);
        } else {
          throw createError(`Withdrawal blocked. ${account.account_number} has ₹${currentBal.toFixed(2)} available and no overdraft.`, 400);
        }
      }

      const newBalance = Number((currentBal - numAmount).toFixed(2));
      await client.query('UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newBalance, account.id]);

      const txnId = await generateTxnIdWithClient(client);
      const lastTxnRes = await client.query('SELECT hash FROM transactions ORDER BY timestamp DESC LIMIT 1 FOR UPDATE');
      const prevHash = lastTxnRes.rows.length > 0 ? lastTxnRes.rows[0].hash : 'GENESIS';
      const txnData = {
        id: txnId,
        accountId: account.id,
        amount: numAmount,
        type: 'withdrawal',
        direction: 'debit',
        timestamp: new Date().toISOString()
      };
      const hash = store.calculateHash(prevHash, txnData);

      const insTxn = await client.query(`
        INSERT INTO transactions (id, transfer_id, account_id, account_number, type, direction, amount, balance, description, reference_id, prev_hash, hash)
        VALUES ($1, NULL, $2, $3, 'withdrawal', 'debit', $4, $5, $6, NULL, $7, $8)
        RETURNING *
      `, [txnId, account.id, account.account_number, numAmount, newBalance, description ? String(description).trim() : 'Account withdrawal', prevHash, hash]);

      await client.query('COMMIT');

      return {
        transaction: mapTxnRow(insTxn.rows[0]),
        account: {
          id: account.id,
          accountNumber: account.account_number,
          balance: newBalance,
          status: account.status
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // In-memory fallback
  const account = store.accounts.find(a => a.id === accountId || a.accountNumber === accountId);
  if (!account) throw createError(`Account '${accountId}' not found`, 404);
  if (account.status !== 'active') {
    throw createError(`Cannot perform withdrawal on account with status '${account.status}'`, 400);
  }
  const currentBal = account.balance;
  const odLimit = account.overdraftEnabled ? (account.overdraftLimit || 0) : 0;
  const maxAvailable = Number((currentBal + odLimit).toFixed(2));
  if (numAmount > maxAvailable) {
    if (account.overdraftEnabled) {
      throw createError(`Withdrawal blocked. ${account.accountNumber} has ₹${currentBal.toFixed(2)} balance and ₹${odLimit.toFixed(2)} overdraft (Total available: ₹${maxAvailable.toFixed(2)}).`, 400);
    } else {
      throw createError(`Withdrawal blocked. ${account.accountNumber} has ₹${currentBal.toFixed(2)} available and no overdraft.`, 400);
    }
  }
  account.balance = Number((account.balance - numAmount).toFixed(2));
  const txnId = `TXN-${String(store.transactions.length + 1).padStart(3, '0')}`;
  const prevHash = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';
  const txn = {
    id: txnId,
    transferId: null,
    accountId: account.id,
    accountNumber: account.accountNumber,
    type: 'withdrawal',
    direction: 'debit',
    amount: numAmount,
    balance: account.balance,
    description: description || 'Account withdrawal',
    referenceId: null,
    timestamp: store.getTimestamp()
  };
  txn.hash = store.calculateHash(prevHash, txn);
  txn.prevHash = prevHash;
  store.transactions.push(txn);
  return { transaction: txn, account };
};

const transfer = async (fromAccountId, toAccountId, amount, description) => {
  if (!fromAccountId || !toAccountId) throw createError('Both fromAccountId and toAccountId are required', 400);
  if (!isPositiveNumber(amount)) throw createError('Enter an amount greater than ₹0.00.', 400);

  const numAmount = Number(Number(amount).toFixed(2));
  if (numAmount < 0.01) {
    throw createError('Enter an amount greater than ₹0.00.', 400);
  }

  if (db.isDbConnected()) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Lock the sender row with SELECT ... FOR UPDATE to prevent race conditions & double-spending
      const fromRes = await client.query(
        'SELECT id, account_number, balance, status, overdraft_enabled, overdraft_limit FROM accounts WHERE id = $1 OR account_number = $1 FOR UPDATE',
        [fromAccountId]
      );
      if (fromRes.rows.length === 0) throw createError(`Source account '${fromAccountId}' not found`, 404);
      const fromAcc = fromRes.rows[0];

      // 2. Lock destination row with SELECT ... FOR UPDATE
      const toRes = await client.query(
        'SELECT id, account_number, balance, status, overdraft_enabled, overdraft_limit FROM accounts WHERE id = $1 OR account_number = $1 FOR UPDATE',
        [toAccountId]
      );
      if (toRes.rows.length === 0) throw createError(`Destination account '${toAccountId}' not found`, 404);
      const toAcc = toRes.rows[0];

      if (fromAcc.id === toAcc.id) throw createError('Choose two different accounts to transfer between.', 400);
      if (fromAcc.status !== 'active') throw createError(`Source account '${fromAcc.account_number}' is not active`, 400);
      if (toAcc.status !== 'active') throw createError(`Destination account '${toAcc.account_number}' is not active`, 400);

      const fromBal = parseFloat(fromAcc.balance);
      const odLimit = fromAcc.overdraft_enabled ? parseFloat(fromAcc.overdraft_limit || 0) : 0;
      const maxAvailable = Number((fromBal + odLimit).toFixed(2));

      if (numAmount > maxAvailable) {
        if (fromAcc.overdraft_enabled) {
          throw createError(`Transfer blocked. ${fromAcc.account_number} has ₹${fromBal.toFixed(2)} balance with ₹${odLimit.toFixed(2)} overdraft (Total available: ₹${maxAvailable.toFixed(2)}).`, 400);
        } else {
          throw createError(`Transfer blocked. ${fromAcc.account_number} has ₹${fromBal.toFixed(2)} available and no overdraft.`, 400);
        }
      }

      const newFromBal = Number((fromBal - numAmount).toFixed(2));
      const newToBal = Number((parseFloat(toAcc.balance) + numAmount).toFixed(2));

      await client.query('UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newFromBal, fromAcc.id]);
      await client.query('UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newToBal, toAcc.id]);

      const transferId = await generateTransferIdWithClient(client);

      const dId = await generateTxnIdWithClient(client);
      const cNum = parseInt(dId.replace('TXN-', ''), 10) + 1;
      const cId = `TXN-${String(cNum).padStart(3, '0')}`;

      const lastTxnRes = await client.query('SELECT hash FROM transactions ORDER BY timestamp DESC LIMIT 1 FOR UPDATE');
      const prevHash1 = lastTxnRes.rows.length > 0 ? lastTxnRes.rows[0].hash : 'GENESIS';

      const dData = {
        id: dId,
        accountId: fromAcc.id,
        amount: numAmount,
        type: 'transfer',
        direction: 'debit',
        timestamp: new Date().toISOString()
      };
      const dHash = store.calculateHash(prevHash1, dData);

      const cData = {
        id: cId,
        accountId: toAcc.id,
        amount: numAmount,
        type: 'transfer',
        direction: 'credit',
        timestamp: dData.timestamp
      };
      const cHash = store.calculateHash(dHash, cData);

      const dIns = await client.query(`
        INSERT INTO transactions (id, transfer_id, account_id, account_number, type, direction, amount, balance, description, reference_id, prev_hash, hash)
        VALUES ($1, $2, $3, $4, 'transfer', 'debit', $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [dId, transferId, fromAcc.id, fromAcc.account_number, numAmount, newFromBal, description || `Transfer to ${toAcc.account_number}`, toAcc.id, prevHash1, dHash]);

      const cIns = await client.query(`
        INSERT INTO transactions (id, transfer_id, account_id, account_number, type, direction, amount, balance, description, reference_id, prev_hash, hash)
        VALUES ($1, $2, $3, $4, 'transfer', 'credit', $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [cId, transferId, toAcc.id, toAcc.account_number, numAmount, newToBal, description || `Transfer from ${fromAcc.account_number}`, fromAcc.id, dHash, cHash]);

      await client.query('COMMIT');

      return {
        transferId,
        transferDebit: mapTxnRow(dIns.rows[0]),
        transferCredit: mapTxnRow(cIns.rows[0]),
        fromAccount: { id: fromAcc.id, accountNumber: fromAcc.account_number, balance: newFromBal, status: fromAcc.status },
        toAccount: { id: toAcc.id, accountNumber: toAcc.account_number, balance: newToBal, status: toAcc.status }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // In-memory fallback
  const fromAcc = store.accounts.find(a => a.id === fromAccountId || a.accountNumber === fromAccountId);
  if (!fromAcc) throw createError(`Source account '${fromAccountId}' not found`, 404);

  const toAcc = store.accounts.find(a => a.id === toAccountId || a.accountNumber === toAccountId);
  if (!toAcc) throw createError(`Destination account '${toAccountId}' not found`, 404);

  if (fromAcc.id === toAcc.id) throw createError('Choose two different accounts to transfer between.', 400);
  if (fromAcc.status !== 'active') throw createError(`Source account '${fromAcc.accountNumber}' is not active`, 400);
  if (toAcc.status !== 'active') throw createError(`Destination account '${toAcc.accountNumber}' is not active`, 400);

  const fromBal = fromAcc.balance;
  const odLimit = fromAcc.overdraftEnabled ? (fromAcc.overdraftLimit || 0) : 0;
  const maxAvailable = Number((fromBal + odLimit).toFixed(2));

  if (numAmount > maxAvailable) {
    if (fromAcc.overdraftEnabled) {
      throw createError(`Transfer blocked. ${fromAcc.accountNumber} has ₹${fromBal.toFixed(2)} balance with ₹${odLimit.toFixed(2)} overdraft (Total available: ₹${maxAvailable.toFixed(2)}).`, 400);
    } else {
      throw createError(`Transfer blocked. ${fromAcc.accountNumber} has ₹${fromBal.toFixed(2)} available and no overdraft.`, 400);
    }
  }

  fromAcc.balance = Number((fromBal - numAmount).toFixed(2));
  toAcc.balance = Number((toAcc.balance + numAmount).toFixed(2));

  let maxTrf = 0;
  for (const t of store.transactions) {
    if (t.transferId) {
      const m = t.transferId.match(/^TRF-(\d+)$/i);
      if (m) maxTrf = Math.max(maxTrf, parseInt(m[1], 10));
    }
  }
  const transferId = `TRF-${String(maxTrf + 1).padStart(3, '0')}`;

  const dId = `TXN-${String(store.transactions.length + 1).padStart(3, '0')}`;
  const cId = `TXN-${String(store.transactions.length + 2).padStart(3, '0')}`;

  const prevHash1 = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';
  const now = store.getTimestamp();

  const dTxn = {
    id: dId,
    transferId,
    accountId: fromAcc.id,
    accountNumber: fromAcc.accountNumber,
    type: 'transfer',
    direction: 'debit',
    amount: numAmount,
    balance: fromAcc.balance,
    description: description || `Transfer to ${toAcc.accountNumber}`,
    referenceId: toAcc.id,
    timestamp: now
  };
  dTxn.hash = store.calculateHash(prevHash1, dTxn);
  dTxn.prevHash = prevHash1;
  store.transactions.push(dTxn);

  const cTxn = {
    id: cId,
    transferId,
    accountId: toAcc.id,
    accountNumber: toAcc.accountNumber,
    type: 'transfer',
    direction: 'credit',
    amount: numAmount,
    balance: toAcc.balance,
    description: description || `Transfer from ${fromAcc.accountNumber}`,
    referenceId: fromAcc.id,
    timestamp: now
  };
  cTxn.hash = store.calculateHash(dTxn.hash, cTxn);
  cTxn.prevHash = dTxn.hash;
  store.transactions.push(cTxn);

  return {
    transferId,
    transferDebit: dTxn,
    transferCredit: cTxn,
    fromAccount: fromAcc,
    toAccount: toAcc
  };
};

const getAccountStatement = async (accountId, filters = {}) => {
  if (db.isDbConnected()) {
    const accRes = await db.query('SELECT * FROM accounts WHERE id = $1 OR account_number = $1', [accountId]);
    if (accRes.rows.length === 0) throw createError(`Account '${accountId}' not found`, 404);
    const account = accRes.rows[0];

    const allTxnsRes = await db.query('SELECT * FROM transactions WHERE account_id = $1 ORDER BY timestamp ASC', [account.id]);
    const allAccountTxns = allTxnsRes.rows.map(mapTxnRow);

    const { startDate, endDate, type } = filters;
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    let openingBalance = 0;
    if (start) {
      for (const t of allAccountTxns) {
        const tTime = new Date(t.timestamp).getTime();
        if (tTime < start) {
          if (t.direction === 'credit') openingBalance = Number((openingBalance + t.amount).toFixed(2));
          else if (t.direction === 'debit') openingBalance = Number((openingBalance - t.amount).toFixed(2));
        }
      }
    }

    const filtered = allAccountTxns.filter((t) => {
      const tTime = new Date(t.timestamp).getTime();
      if (start && tTime < start) return false;
      if (end && tTime > end) return false;
      if (type && type !== 'ALL') {
        if (t.type.toLowerCase() !== type.toLowerCase()) return false;
      }
      return true;
    });

    let running = openingBalance;
    let totalDebits = 0;
    let totalCredits = 0;

    const rows = filtered.map((t) => {
      const debit = t.direction === 'debit' ? t.amount : 0;
      const credit = t.direction === 'credit' ? t.amount : 0;
      totalDebits = Number((totalDebits + debit).toFixed(2));
      totalCredits = Number((totalCredits + credit).toFixed(2));
      running = Number((running + credit - debit).toFixed(2));

      return {
        id: t.id,
        transferId: t.transferId || null,
        timestamp: t.timestamp,
        description: t.description,
        type: t.type,
        direction: t.direction,
        debit,
        credit,
        runningBalance: running,
        referenceId: t.referenceId,
        hash: t.hash || null
      };
    });

    return {
      account: {
        id: account.id,
        accountNumber: account.account_number,
        accountType: account.account_type,
        balance: parseFloat(account.balance),
        overdraftEnabled: Boolean(account.overdraft_enabled),
        overdraftLimit: parseFloat(account.overdraft_limit || 0),
        status: account.status
      },
      period: { startDate: startDate || null, endDate: endDate || null },
      openingBalance,
      totalDebits,
      totalCredits,
      closingBalance: running,
      transactions: rows
    };
  }

  // In-memory statement
  const account = store.accounts.find(a => a.id === accountId || a.accountNumber === accountId);
  if (!account) throw createError(`Account '${accountId}' not found`, 404);

  const allAccountTxns = store.transactions.filter(t => t.accountId === account.id || t.accountNumber === account.accountNumber);
  allAccountTxns.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const { startDate, endDate, type } = filters;
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

  let openingBalance = 0;
  if (start) {
    for (const t of allAccountTxns) {
      const tTime = new Date(t.timestamp).getTime();
      if (tTime < start) {
        if (t.direction === 'credit') openingBalance = Number((openingBalance + t.amount).toFixed(2));
        else if (t.direction === 'debit') openingBalance = Number((openingBalance - t.amount).toFixed(2));
      }
    }
  }

  const filtered = allAccountTxns.filter((t) => {
    const tTime = new Date(t.timestamp).getTime();
    if (start && tTime < start) return false;
    if (end && tTime > end) return false;
    if (type && type !== 'ALL') {
      if (t.type.toLowerCase() !== type.toLowerCase()) return false;
    }
    return true;
  });

  let running = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const rows = filtered.map((t) => {
    const debit = t.direction === 'debit' ? t.amount : 0;
    const credit = t.direction === 'credit' ? t.amount : 0;
    totalDebits = Number((totalDebits + debit).toFixed(2));
    totalCredits = Number((totalCredits + credit).toFixed(2));
    running = Number((running + credit - debit).toFixed(2));

    return {
      id: t.id,
      transferId: t.transferId || null,
      timestamp: t.timestamp,
      description: t.description,
      type: t.type,
      direction: t.direction,
      debit,
      credit,
      runningBalance: running,
      referenceId: t.referenceId,
      hash: t.hash || null
    };
  });

  return {
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      overdraftEnabled: Boolean(account.overdraftEnabled),
      overdraftLimit: account.overdraftLimit || 0,
      status: account.status
    },
    period: { startDate: startDate || null, endDate: endDate || null },
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: running,
    transactions: rows
  };
};

module.exports = {
  getTransactionsByAccountId,
  getAllTransactions,
  getAccountStatement,
  deposit,
  withdraw,
  transfer
};
