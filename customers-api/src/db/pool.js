import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.warn('⚠️ Variables de entorno de DB incompletas');
}

export const pool = mysql.createPool({
  host: DB_HOST || 'localhost',
  port: DB_PORT ? Number(DB_PORT) : 3306,
  user: DB_USER || 'root',
  password: DB_PASSWORD || '',
  database: DB_NAME || 'b2b_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper simple para ejecutar queries parametrizados
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
