const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kis_school',
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = pool;
