import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  const connection = await mysql.createConnection({
    host: DB_HOST || 'localhost',
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER || 'root',
    password: DB_PASSWORD || '',
    database: DB_NAME || 'b2b_db',
    multipleStatements: true,
  });

  console.log('🚀 Ejecutando migraciones de customers-api...');
  await connection.query(sql);
  await connection.end();
  console.log('✅ Migraciones completadas');
}

runMigrations()
  .catch((err) => {
    console.error('❌ Error ejecutando migraciones:', err);
    process.exit(1);
  });
