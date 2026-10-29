import db from "../config/db.js";

export const getAvailabilitySlots = async (
  req,
  res
) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.*,
        c.name AS counsellor_name,
        c.specialization
      FROM availability_slots a
      JOIN counsellors c
        ON a.counsellor_id = c.id
      ORDER BY a.available_date
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createAvailability = async (
  req,
  res
) => {
  try {
    const {
      counsellorId,
      availableDate,
      startTime,
      endTime,
    } = req.body;

    const [conflicts] = await db.query(
      `
      SELECT *
      FROM availability_slots
      WHERE counsellor_id = ?
      AND available_date = ?
      AND (
        start_time < ?
        AND end_time > ?
      )
      `,
      [
        counsellorId,
        availableDate,
        endTime,
        startTime,
      ]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({
        message:
          "This time slot overlaps with an existing slot",
      });
    }

    await db.query(
      `
      INSERT INTO availability_slots
      (
        counsellor_id,
        available_date,
        start_time,
        end_time,
        is_booked,
        status
      )
      VALUES
      (?, ?, ?, ?, FALSE, 'Available')
      `,
      [
        counsellorId,
        availableDate,
        startTime,
        endTime,
      ]
    );

    res.status(201).json({
      message: "Availability created",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateAvailability =
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        startTime,
        endTime,
        status,
      } = req.body;

      const [slotRows] = await db.query(
        `
        SELECT *
        FROM availability_slots
        WHERE id = ?
        `,
        [id]
      );

      if (slotRows.length === 0) {
        return res.status(404).json({
          message: "Slot not found",
        });
      }

      const slot = slotRows[0];

      await db.query(
        `
        UPDATE availability_slots
        SET
          start_time = ?,
          end_time = ?,
          status = ?,
          is_booked =
            CASE
              WHEN ? = 'Available' THEN FALSE
              WHEN ? = 'Booked' THEN TRUE
              ELSE is_booked
            END
        WHERE id = ?
        `,
        [
          startTime,
          endTime,
          status,
          status,
          status,
          id,
        ]
      );

      /*
        If a booked slot becomes unavailable,
        create notification records
      */
      if (
        slot.is_booked &&
        status === "Unavailable"
      ) {
        const [appointments] = await db.query(
          `
          SELECT *
          FROM appointments
          WHERE slot_id = ?
          `,
          [id]
        );

        for (const appointment of appointments) {
          await db.query(
            `
            INSERT INTO notifications
            (
              user_id,
              message
            )
            VALUES (?, ?)
            `,
            [
              appointment.student_id,
              "Your counselling appointment has been cancelled because the counsellor marked the slot unavailable. Please book a new session."
            ]
          );
        }
      }

      res.json({
        message:
          "Availability updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const deleteAvailability =
  async (req, res) => {
    try {
      const { id } = req.params;

      await db.query(
        `
        DELETE FROM availability_slots
        WHERE id = ?
        `,
        [id]
      );

      res.json({
        message:
          "Availability deleted",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };