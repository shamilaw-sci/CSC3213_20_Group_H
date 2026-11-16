import db from "../config/db.js";

export const getEmergencyAvailability = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT is_available FROM counsellor_profiles WHERE user_id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Counsellor profile not found." });
    }

    return res.json({ isAvailable: rows.some((row) => Boolean(row.is_available)) });
  } catch (error) {
    console.error("Failed to load emergency availability:", error);
    return res.status(500).json({ message: "Unable to load emergency availability." });
  }
};

export const updateEmergencyAvailability = async (req, res) => {
  if (typeof req.body?.isAvailable !== "boolean") {
    return res.status(400).json({ message: "isAvailable must be a boolean." });
  }

  try {
    const [result] = await db.query(
      "UPDATE counsellor_profiles SET is_available = ? WHERE user_id = ?",
      [req.body.isAvailable, req.user.id]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        "SELECT id FROM counsellor_profiles WHERE user_id = ?",
        [req.user.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Counsellor profile not found." });
      }
    }

    return res.json({ isAvailable: req.body.isAvailable });
  } catch (error) {
    console.error("Failed to update emergency availability:", error);
    return res.status(500).json({ message: "Unable to update emergency availability." });
  }
};

let bookingTablesReadyPromise = null;

export const ensureBookingTables = () => {
  if (!bookingTablesReadyPromise) {
    bookingTablesReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS counsellors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE,
          name VARCHAR(255) NOT NULL,
          specialization VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
    const [rows] = await db.query(
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
      AND status = 'Available'
      AND is_booked = FALSE
      ORDER BY available_date, start_time
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

      const [slots] = await db.query(
        `
        SELECT *
        FROM availability_slots
        WHERE id = ?
        `,
        [slotId]
      );

      if (slots.length === 0) {
        return res.status(404).json({
          message: "Slot not found",
        });
      }

      const slot = slots[0];

      if (slot.is_booked) {
        return res.status(400).json({
          message:
            "This slot has already been booked",
        });
      }

      if (
        slot.status === "Unavailable"
      ) {
        return res.status(400).json({
          message:
            "This slot is currently unavailable",
        });
      }

      if (
        slot.status === "Booked"
      ) {
        return res.status(400).json({
          message:
            "This slot has already been booked",
        });
      }

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
        SET
          is_booked = TRUE,
          status = 'Booked'
        WHERE id = ?
        `,
        [slotId]
      );

      res.status(201).json({
        message:
          "Appointment booked successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: error.message,
      });
    }
  };