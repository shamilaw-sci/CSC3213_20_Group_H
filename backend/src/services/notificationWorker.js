import pool from "../config/db.js";
import { dispatchRedundantNotifications } from "../controllers/emergencyController.js";

const MAX_ATTEMPTS = 3;
let processing = false;

function parsePayload(payload) {
  if (typeof payload === "string") {
    return JSON.parse(payload);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Notification payload is missing or invalid.");
  }

  return payload;
}

async function dispatchFromOutbox(job) {
  const details = parsePayload(job.payload);
  const result = await dispatchRedundantNotifications(details);

  if (!result.emailSent && !result.smsSent) {
    throw new Error("Notification delivery failed on all configured channels.");
  }
}

export async function processPendingNotifications() {
  if (processing) {
    console.warn("[NOTIFICATIONS] Previous processing cycle is still running.");
    return;
  }

  processing = true;

  try {
    const [jobs] = await pool.query(
      `SELECT id, payload
       FROM emergency_notifications
       WHERE status IN ('PENDING', 'FAILED')
         AND attempts < ?
       ORDER BY created_at ASC
       LIMIT 50`,
      [MAX_ATTEMPTS]
    );

    for (const job of jobs) {
      const [claimResult] = await pool.query(
        `UPDATE emergency_notifications
         SET attempts = attempts + 1
         WHERE id = ?
           AND status IN ('PENDING', 'FAILED')
           AND attempts < ?`,
        [job.id, MAX_ATTEMPTS]
      );

      if (claimResult.affectedRows !== 1) {
        continue;
      }

      try {
        await dispatchFromOutbox(job);

        await pool.query(
          `UPDATE emergency_notifications
           SET status = 'SENT', last_error = NULL
           WHERE id = ?`,
          [job.id]
        );
      } catch (error) {
        console.error(
          `[NOTIFICATIONS] Job ${job.id} failed:`,
          error.message
        );

        await pool.query(
          `UPDATE emergency_notifications
           SET status = 'FAILED', last_error = ?
           WHERE id = ?`,
          [error.message, job.id]
        );
      }
    }
  } finally {
    processing = false;
  }
}
