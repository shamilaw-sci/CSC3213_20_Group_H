const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  try {
    console.log("Connecting to MySQL...");

    // Create database if it doesn't exist
    const tempPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    await tempPool.query('CREATE DATABASE IF NOT EXISTS `mind_ease_db`');

    // Connect to the database
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mind_ease_db',
    });

    console.log("Creating users table if it doesn't exist...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Student',
        anonymousId VARCHAR(100),
        isAnonymous BOOLEAN DEFAULT FALSE
      )
    `);

    // Ensure name column exists
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS name VARCHAR(255) AFTER id
    `);

    const users = [
      {
        name: "System Admin",
        email: "admin@carebridge.com",
        password: "admin123",
        role: "Admin",
      },
      {
        name: "Test Student",
        email: "student@carebridge.com",
        password: "password123",
        role: "Student",
      },
    ];

    console.log("Seeding users...");

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await pool.query(
        `
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password = VALUES(password),
          role = VALUES(role)
        `,
        [
          user.name,
          user.email,
          hashedPassword,
          user.role,
        ]
      );

      console.log(`✅ ${user.role} account ready: ${user.email}`);
    }

    console.log("\n=========================================");
    console.log("Database seeded successfully!");
    console.log("=========================================");
    console.log("Admin Account");
    console.log("Email: admin@carebridge.com");
    console.log("Password: admin123");
    console.log("-----------------------------------------");
    console.log("Student Account");
    console.log("Email: student@carebridge.com");
    console.log("Password: password123");
    console.log("=========================================");

    await pool.end();
    await tempPool.end();

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();