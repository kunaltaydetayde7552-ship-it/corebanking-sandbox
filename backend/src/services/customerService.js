const db = require('../config/db');
const store = require('../models/store');
const { isValidEmail, isValidPhone } = require('../utils/validators');

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const mapCustomerRow = (row) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  address: row.address || '',
  dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString().slice(0, 10) : '',
  createdAt: row.created_at ? row.created_at.toISOString() : ''
});

const generateCustomerId = async () => {
  if (db.isDbConnected()) {
    const res = await db.query("SELECT id FROM customers WHERE id ~ '^CUST-[0-9]+$'");
    let maxId = 0;
    for (const row of res.rows) {
      const match = row.id.match(/^CUST-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    return `CUST-${String(maxId + 1).padStart(3, '0')}`;
  }

  let maxId = 0;
  for (const c of store.customers) {
    const match = c.id && c.id.match(/^CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  return `CUST-${String(maxId + 1).padStart(3, '0')}`;
};

const getAllCustomers = async () => {
  if (db.isDbConnected()) {
    const res = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
    return res.rows.map(mapCustomerRow);
  }
  return [...store.customers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getCustomerById = async (id) => {
  if (db.isDbConnected()) {
    const res = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw createError(`Customer with ID '${id}' not found`, 404);
    }
    return mapCustomerRow(res.rows[0]);
  }
  const customer = store.customers.find((c) => c.id === id);
  if (!customer) {
    throw createError(`Customer with ID '${id}' not found`, 404);
  }
  return customer;
};

const createCustomer = async (data) => {
  const { firstName, lastName, email, phone, address, dateOfBirth } = data || {};

  if (!firstName || !String(firstName).trim()) {
    throw createError('First name is required');
  }
  if (!lastName || !String(lastName).trim()) {
    throw createError('Last name is required');
  }
  if (!email || !isValidEmail(email)) {
    throw createError('A valid email address is required');
  }
  if (!phone || !isValidPhone(phone)) {
    throw createError('A valid 10-digit phone number is required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (db.isDbConnected()) {
    const checkRes = await db.query('SELECT id FROM customers WHERE LOWER(email) = $1', [normalizedEmail]);
    if (checkRes.rows.length > 0) {
      throw createError(`Customer with email '${normalizedEmail}' already exists`, 409);
    }

    const newId = await generateCustomerId();
    const insertRes = await db.query(`
      INSERT INTO customers (id, first_name, last_name, email, phone, address, date_of_birth)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      newId,
      String(firstName).trim(),
      String(lastName).trim(),
      normalizedEmail,
      String(phone).trim(),
      address ? String(address).trim() : '',
      dateOfBirth ? String(dateOfBirth).trim() : null
    ]);

    return mapCustomerRow(insertRes.rows[0]);
  }

  const emailExists = store.customers.some(
    (c) => c.email && c.email.toLowerCase() === normalizedEmail
  );
  if (emailExists) {
    throw createError(`Customer with email '${normalizedEmail}' already exists`, 409);
  }

  const newCustomer = {
    id: await generateCustomerId(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    address: address ? String(address).trim() : '',
    dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : '',
    createdAt: store.getTimestamp()
  };

  store.customers.push(newCustomer);
  return newCustomer;
};

const updateCustomer = async (id, data) => {
  if (db.isDbConnected()) {
    const existRes = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existRes.rows.length === 0) {
      throw createError(`Customer with ID '${id}' not found`, 404);
    }
    const current = existRes.rows[0];
    const { firstName, lastName, email, phone, address, dateOfBirth } = data || {};

    let newEmail = current.email;
    if (email !== undefined) {
      if (!isValidEmail(email)) {
        throw createError('A valid email address is required');
      }
      newEmail = email.trim().toLowerCase();
      const conflictRes = await db.query('SELECT id FROM customers WHERE LOWER(email) = $1 AND id != $2', [newEmail, id]);
      if (conflictRes.rows.length > 0) {
        throw createError(`Customer with email '${newEmail}' already exists`, 409);
      }
    }

    if (phone !== undefined && !isValidPhone(phone)) {
      throw createError('A valid 10-digit phone number is required');
    }

    const updatedRes = await db.query(`
      UPDATE customers
      SET first_name = $1, last_name = $2, email = $3, phone = $4, address = $5, date_of_birth = $6
      WHERE id = $7
      RETURNING *
    `, [
      firstName !== undefined ? String(firstName).trim() : current.first_name,
      lastName !== undefined ? String(lastName).trim() : current.last_name,
      newEmail,
      phone !== undefined ? String(phone).trim() : current.phone,
      address !== undefined ? String(address).trim() : current.address,
      dateOfBirth !== undefined ? String(dateOfBirth).trim() : current.date_of_birth,
      id
    ]);

    return mapCustomerRow(updatedRes.rows[0]);
  }

  const index = store.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    throw createError(`Customer with ID '${id}' not found`, 404);
  }

  const current = store.customers[index];
  const { firstName, lastName, email, phone, address, dateOfBirth } = data || {};

  if (email !== undefined) {
    if (!isValidEmail(email)) {
      throw createError('A valid email address is required');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailConflict = store.customers.some(
      (c) => c.id !== id && c.email && c.email.toLowerCase() === normalizedEmail
    );
    if (emailConflict) {
      throw createError(`Customer with email '${normalizedEmail}' already exists`, 409);
    }
    current.email = normalizedEmail;
  }

  if (phone !== undefined) {
    if (!isValidPhone(phone)) {
      throw createError('A valid 10-digit phone number is required');
    }
    current.phone = String(phone).trim();
  }

  if (firstName !== undefined && String(firstName).trim()) {
    current.firstName = String(firstName).trim();
  }
  if (lastName !== undefined && String(lastName).trim()) {
    current.lastName = String(lastName).trim();
  }
  if (address !== undefined) {
    current.address = String(address).trim();
  }
  if (dateOfBirth !== undefined) {
    current.dateOfBirth = String(dateOfBirth).trim();
  }

  return current;
};

const deleteCustomer = async (id) => {
  if (db.isDbConnected()) {
    const accRes = await db.query("SELECT id FROM accounts WHERE customer_id = $1 AND status != 'inactive'", [id]);
    if (accRes.rows.length > 0) {
      throw createError(`Cannot delete customer '${id}'. They have active accounts.`, 400);
    }
    const delRes = await db.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    if (delRes.rows.length === 0) {
      throw createError(`Customer with ID '${id}' not found`, 404);
    }
    return mapCustomerRow(delRes.rows[0]);
  }

  const index = store.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    throw createError(`Customer with ID '${id}' not found`, 404);
  }

  const customerAccounts = store.accounts.filter(
    (a) => a.customerId === id && a.status !== 'inactive'
  );
  if (customerAccounts.length > 0) {
    throw createError(
      `Cannot delete customer with ID '${id}'. Customer has ${customerAccounts.length} active or frozen account(s). Please close them first.`,
      400
    );
  }

  const [deleted] = store.customers.splice(index, 1);
  return deleted;
};

const getCustomerAccounts = async (customerId) => {
  if (db.isDbConnected()) {
    await getCustomerById(customerId);
    const res = await db.query('SELECT * FROM accounts WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    return res.rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      accountNumber: row.account_number,
      accountType: row.account_type,
      balance: parseFloat(row.balance),
      overdraftEnabled: Boolean(row.overdraft_enabled),
      overdraftLimit: parseFloat(row.overdraft_limit || 0),
      status: row.status,
      createdAt: row.created_at ? row.created_at.toISOString() : ''
    }));
  }

  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) {
    throw createError(`Customer with ID '${customerId}' not found`, 404);
  }
  return store.accounts.filter((a) => a.customerId === customerId);
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAccounts
};
