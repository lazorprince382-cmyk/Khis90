const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(
    `INSERT INTO users (username, password_hash, full_name, role)
     VALUES ('admin', $1, 'System Administrator', 'admin')
     ON CONFLICT (username) DO UPDATE SET password_hash = $1`,
    [hash]
  );
  console.log('Admin ready: admin / admin123');
  await c.end();
}
seed();
