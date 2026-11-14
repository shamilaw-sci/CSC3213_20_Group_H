import db from "../config/db.js";

let bookingTablesReadyPromise = null;

export const ensureBookingTables = () => {
  if (!bookingTablesReadyPromise) {
    bookingTablesReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS counsellors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          specialization VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS availability_slots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          counsellor_id INT NOT NULL,
          available_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_booked BOOLEAN NOT NULL DEFAULT FALSE,
          status VARCHAR(50) NOT NULL DEFAULT 'Available',
          FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE CASCADE
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          counsellor_id INT NOT NULL,
          slot_id INT NOT NULL,
          booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE CASCADE,
          FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE
        )
      `);

      const [[{ count }]] = await db.query(
        "SELECT COUNT(*) AS count FROM counsellors"
      );

      if (count === 0) {
        const defaultCounsellors = [
          [
            "Dr. Sarah Jenkins",
            "Clinical Psychology & Anxiety",
          ],
          [
            "Dr. Priya Nair",
            "Academic Stress & Burnout",
          ],
          [
            "Mr. Kasun Perera",
            "Student Wellbeing & Mindfulness",
          ],
        ];

        for (const [
          name,
          specialization,
        ] of defaultCounsellors) {
          const [result] = await db.query(
            "INSERT INTO counsellors (name, specialization) VALUES (?, ?)",
            [name, specialization]
          );

          const counsellorId = result.insertId;

          await db.query(
            `
            INSERT INTO availability_slots
              (counsellor_id, available_date, start_time, end_time, is_booked)
            VALUES
              (?, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '10:00:00', FALSE),
              (?, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '15:00:00', FALSE),
              (?, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:30:00', '11:30:00', FALSE)
            `,
            [
              counsellorId,
              counsellorId,
              counsellorId,
            ]
          );
        }
      }
    })().catch((err) => {
      bookingTablesReadyPromise = null;
      throw err;
    });
  }

  return bookingTablesReadyPromise;
};

export const getCounsellors = async (
  req,
  res
) => {
  try {
    await ensureBookingTables();

    const [rows] =
      await db.query(
        "SELECT * FROM counsellors"
      );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAvailability = async (
  req,
  res
) => {
  try {
    await ensureBookingTables();

    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT *
      FROM availability_slots
      WHERE counsellor_id = ?
      AND is_booked = FALSE
      `,
      [id]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const bookAppointment =
  async (req, res) => {
    try {
      await ensureBookingTables();

      const {
        studentId,
        counsellorId,
        slotId,
      } = req.body;

      await db.query(
        `
        INSERT INTO appointments
        (
          student_id,
          counsellor_id,
          slot_id
        )
        VALUES (?, ?, ?)
        `,
        [
          studentId,
          counsellorId,
          slotId,
        ]
      );

      await db.query(
        `
        UPDATE availability_slots
        SET is_booked = TRUE
        WHERE id = ?
        `,
        [slotId]
      );

      res.status(201).json({
        message:
          "Appointment booked successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };