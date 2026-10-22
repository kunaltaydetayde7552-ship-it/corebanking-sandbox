const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

const query = async (text, params) => {
  if (!pool) return null;
  return pool.query(text, params);
};

const getClient = async () => {
  if (!pool) return null;
  return pool.connect();
};

const isDbConnected = () => Boolean(pool);

module.exports = {
  pool,
  query,
  getClient,
  isDbConnected
};
