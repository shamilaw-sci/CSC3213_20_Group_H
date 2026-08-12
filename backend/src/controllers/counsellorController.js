import db from "../config/db.js";

export const getCounsellors = async (
  req,
  res
) => {
  try {
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