import mysql from 'mysql2/promise';
import {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} from '../config/env.js';

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.warn('⚠️ [orders-api] Variables DB incompletas');
}

export const pool = mysql.createPool({
  host: DB_HOST || '127.0.0.1',
  port: DB_PORT ? Number(DB_PORT) : 3306,
  user: DB_USER || 'root',
  password: DB_PASSWORD || '',
  database: DB_NAME || 'b2b_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
