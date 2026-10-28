import db from "../config/db.js";

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