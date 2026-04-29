const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mind_ease_db',
  });

  try {
    console.log("Connecting and preparing table...");
    // Create database if it doesn't exist
    const tempPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    await tempPool.query('CREATE DATABASE IF NOT EXISTS `mind_ease_db`');
    
    // Create the users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Student'
      )
    `);

    const email = 'test@example.com';
    const plainPassword = 'password123';
    
    console.log(`Hashing password for ${email}...`);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    console.log("Inserting user into database...");
    
    // Use INSERT IGNORE to prevent crashing if the user already exists
    await pool.query(
      'INSERT IGNORE INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'Student']
    );

    console.log("=========================================");
    console.log("✅ Seed complete! You can now test your login form.");
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    console.log("=========================================");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
