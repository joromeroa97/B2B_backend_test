import dotenv from 'dotenv';
dotenv.config();

export const {
  PORT,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  JWT_SECRET,
  SERVICE_TOKEN,
  ADMIN_USER,
  ADMIN_PASSWORD,
  CUSTOMERS_API_BASE,
} = process.env;
