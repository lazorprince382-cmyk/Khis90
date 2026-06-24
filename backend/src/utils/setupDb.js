const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kis_school';
  const shouldCreateLocalDb = !process.env.DATABASE_URL;

  if (shouldCreateLocalDb) {
    const adminUrl = dbUrl.replace(/\/kis_school$/, '/postgres');
    const admin = new Client({ connectionString: adminUrl });
    try {
      await admin.connect();
      const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'kis_school'");
      if (exists.rows.length === 0) {
        await admin.query('CREATE DATABASE kis_school');
        console.log('Database kis_school created.');
      }
    } catch (err) {
      console.error('Could not create database:', err.message);
      process.exit(1);
    } finally {
      await admin.end();
    }
  } else {
    console.log('Using provided DATABASE_URL; skipping database creation.');
  }

  const pool = new Client({ connectionString: dbUrl });
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  const migrationPath = path.join(__dirname, '../../../database/migration_v2.sql');
  const migrationV3Path = path.join(__dirname, '../../../database/migration_v3.sql');
  const migrationV4Path = path.join(__dirname, '../../../database/migration_v4.sql');
  const migrationV5Path = path.join(__dirname, '../../../database/migration_v5.sql');
  const migrationV6Path = path.join(__dirname, '../../../database/migration_v6.sql');
  const migrationV7Path = path.join(__dirname, '../../../database/migration_v7.sql');

  try {
    await pool.connect();
    const hasLearners = await pool.query("SELECT to_regclass('public.learners') AS table_name");
    if (!hasLearners.rows[0].table_name) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('Base schema applied.');
    } else {
      console.log('Base schema already exists, skipping.');
    }

    for (const mig of [migrationPath, migrationV3Path, migrationV4Path, migrationV5Path, migrationV6Path, migrationV7Path]) {
      if (fs.existsSync(mig)) {
        await pool.query(fs.readFileSync(mig, 'utf8'));
        console.log(`Migration applied: ${path.basename(mig)}`);
      }
    }

    const hash = await bcrypt.hash('admin123', 10);
    const adminExists = await pool.query("SELECT 1 FROM users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (username, password_hash, full_name, role, dashboard_access, notification_access)
         VALUES ('admin', $1, 'System Administrator', 'admin', ARRAY['*'], ARRAY['*'])`,
        [hash]
      );
      console.log('Default admin created (username: admin, password: admin123)');
    } else {
      await pool.query(
        `UPDATE users
         SET password_hash = $1, dashboard_access = ARRAY['*'], notification_access = ARRAY['*']
         WHERE username = $2`,
        [hash, 'admin']
      );
      console.log('Admin password reset to: admin123');
    }

    console.log('Database setup complete.');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
