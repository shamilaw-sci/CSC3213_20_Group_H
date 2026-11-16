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

    console.log("Database configuration:", {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'mind_ease_db',
    });

    const [dbInfo] = await pool.query(
      "SELECT DATABASE() AS db, @@port AS port, @@hostname AS host"
    );

    console.log("Connected database:", dbInfo[0]);

    const users = [
      {
        name: "System Admin",
        email: "admin@carebridge.com",
        password: "admin123",
        role: "admin",
      },
      {
        name: "Test Student",
        email: "student@carebridge.com",
        password: "password123",
        role: "student",
      },
      {
        name: "Test Counsellor",
        email: "counsellor@carebridge.com",
        password: "counsellor123",
        role: "counsellor",
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

      if (user.role === "counsellor") {
        const [rows] = await pool.query(
          "SELECT id FROM users WHERE email = ?",
          [user.email]
        );

        const userId = rows[0].id;

        await pool.query(
          `
          INSERT INTO counsellors (user_id, name, specialization)
          VALUES (?, ?, 'General Mental Health Counselling')
          ON DUPLICATE KEY UPDATE
            name = VALUES(name)
          `,
          [userId, user.name]
        );

        const [existingProfiles] = await pool.query(
          "SELECT id FROM counsellor_profiles WHERE user_id = ? LIMIT 1",
          [userId]
        );

        if (existingProfiles.length > 0) {
          await pool.query(
            `UPDATE counsellor_profiles
             SET verification_status = 'approved', is_available = TRUE
             WHERE user_id = ?`,
            [userId]
          );
        } else {
          await pool.query(
            `INSERT INTO counsellor_profiles
              (user_id, verification_status, is_available)
             VALUES (?, 'approved', TRUE)`,
            [userId]
          );
        }

        console.log("✅ Counsellor profile ready and approved");
      }
    }

    console.log("\n=========================================");
    console.log("Database seeded successfully!");
    console.log("=========================================");
    console.log("Admin Account");
    console.log("Email: admin@carebridge.com");
    console.log("Password: admin123");
    console.log("-----------------------------------------");
    console.log("Counsellor Account");
    console.log("Email: counsellor@carebridge.com");
    console.log("Password: counsellor123");
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