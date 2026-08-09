import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  try {
    console.log("Connecting to MySQL...");

    // Schema is created by backend/db/init/*.sql when the Docker MySQL
    // container first starts (see docker-compose.yml). This script only seeds data.
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mind_ease_db',
    });

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

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();