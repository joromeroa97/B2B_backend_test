import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
    console.log('📄 [orders-api] Leyendo schema desde:', schemaPath);

    if (!fs.existsSync(schemaPath)) {
      console.error('❌ [orders-api] schema.sql no existe en esa ruta');
      process.exit(1);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');

    const {
      DB_HOST,
      DB_PORT,
      DB_USER,
      DB_PASSWORD,
      DB_NAME,
    } = process.env;

    console.log('🌐 [orders-api] Conectando a MySQL con:');
    console.log({
      DB_HOST,
      DB_PORT,
      DB_USER,
      DB_NAME,
    });

    const connection = await mysql.createConnection({
      host: DB_HOST || '127.0.0.1',
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER || 'root',
      password: DB_PASSWORD || '',
      database: DB_NAME || 'b2b_db',
      multipleStatements: true,
    });

    console.log('🚀 [orders-api] Ejecutando migraciones...');
    await connection.query(sql);
    await connection.end();
    console.log('✅ [orders-api] Migraciones completadas');
  } catch (err) {
    console.error('❌ [orders-api] Error ejecutando migraciones:');
    console.error(err);
    process.exit(1);
  }
}

runMigrations();
