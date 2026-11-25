import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isSSL = process.env.MYSQL_SSL === 'true' || process.env.MYSQL_SSL === '1';

// Load connection settings from environment variables. These should be defined in a .env file at the project root.
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? 'campusbites',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: isSSL
    ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      }
    : undefined,
});

export default pool;
