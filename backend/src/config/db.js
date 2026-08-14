import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mind_ease_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// A lost/reset connection surfaces here rather than crashing the process outright.
pool.on('error', (err) => {
    console.error('Unexpected MySQL pool error:', err.code || err.message);
});

export async function testConnection() {
    const connection = await pool.getConnection();
    connection.release();
}

export default pool;
