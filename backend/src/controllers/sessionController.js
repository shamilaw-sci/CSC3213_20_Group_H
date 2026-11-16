import db from "../config/db.js";
import { ensureBookingTables } from "./counsellorController.js";

/*
|--------------------------------------------------------------------------
| Get All Appointments
|--------------------------------------------------------------------------
| GET /api/sessions/appointments
*/
export const getAllAppointments = async (req, res) => {
  try {
    await ensureBookingTables();

    const [rows] = await db.query(`
      SELECT
        a.id,
        a.student_id,
        c.name,
        c.name AS counsellor_name,
        c.specialization,
        s.available_date,
        s.start_time,
        s.end_time,
        a.booked_at
      FROM appointments a
      JOIN counsellors c
        ON a.counsellor_id = c.id
      JOIN availability_slots s
        ON a.slot_id = s.id
      ORDER BY a.booked_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Get appointments error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Student Sessions
|--------------------------------------------------------------------------
| GET /api/sessions/:studentId
*/
export const getStudentSessions = async (
  req,
  res
) => {
  try {
    await ensureBookingTables();

    const { studentId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        a.id,
        a.booked_at,
        c.name,
        c.name AS counsellor_name,
        c.specialization,
        s.available_date,
        s.start_time,
        s.end_time
      FROM appointments a
      JOIN counsellors c
        ON a.counsellor_id = c.id
      JOIN availability_slots s
        ON a.slot_id = s.id
      WHERE a.student_id = ?
      ORDER BY a.booked_at DESC
      `,
      [studentId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Get student sessions error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};