const { Pool } = require('pg');

let pool = null;

const getPool = () => {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
};

// Initialize immediately if DATABASE_URL already present
if (process.env.DATABASE_URL) {
  getPool();
}

const query = async (text, params) => {
  const p = getPool();
  if (!p) return null;
  return p.query(text, params);
};

const getClient = async () => {
  const p = getPool();
  if (!p) return null;
  return p.connect();
};

const isDbConnected = () => Boolean(getPool());

module.exports = {
  get pool() {
    return getPool();
  },
  query,
  getClient,
  isDbConnected
};
