import db from "../config/db.js";
import { createNotification } from "./notificationService.js";
import { recordAuditLog } from "../utils/auditLogger.js";

const DEFAULT_ESCALATION_MINUTES = Number(process.env.ALERT_ESCALATION_MINUTES || 5);

export async function acknowledgeEmergencyAlert({ emergencyId, actorId, actorRole, notes = null }) {
  const [rows] = await db.query(`SELECT * FROM emergencies WHERE id = ?`, [emergencyId]);
  if (rows.length === 0) {
    return null;
  }

  await db.query(
    `UPDATE emergencies
     SET status = 'Acknowledged',
         acknowledged_by = COALESCE(acknowledged_by, ?),
         acknowledged_at = COALESCE(acknowledged_at, NOW()),
         outcome_notes = COALESCE(?, outcome_notes)
     WHERE id = ?`,
    [actorId, notes, emergencyId]
  );

  await db.query(
    `UPDATE notifications
     SET acknowledged_by = COALESCE(acknowledged_by, ?),
         acknowledged_at = COALESCE(acknowledged_at, NOW()),
         is_read = TRUE
     WHERE reference_type = 'emergency' AND reference_id = ?`,
    [actorId, emergencyId]
  );

  await recordAuditLog({
    actorId,
    actorRole,
    action: "EMERGENCY_ACKNOWLEDGED",
    entityType: "emergency",
    entityId: Number(emergencyId),
    details: { notes },
  });

  if (global.io) {
    global.io.to("counsellors-room").emit("emergencyUpdated", {
      emergencyId: Number(emergencyId),
      status: "Acknowledged",
      acknowledgedBy: actorId,
    });
    global.io.to("admin-room").emit("emergencyUpdated", {
      emergencyId: Number(emergencyId),
      status: "Acknowledged",
      acknowledgedBy: actorId,
    });
  }

  const [updated] = await db.query(`SELECT * FROM emergencies WHERE id = ?`, [emergencyId]);
  return updated[0];
}

export async function resolveEmergencyAlert({ emergencyId, actorId, actorRole, outcomeNotes }) {
  const [rows] = await db.query(`SELECT * FROM emergencies WHERE id = ?`, [emergencyId]);
  if (rows.length === 0) {
    return null;
  }

  await db.query(
    `UPDATE emergencies
     SET status = 'Resolved',
         acknowledged_by = COALESCE(acknowledged_by, ?),
         acknowledged_at = COALESCE(acknowledged_at, NOW()),
         resolved_by = ?,
         resolved_at = NOW(),
         outcome_notes = ?
     WHERE id = ?`,
    [actorId, actorId, outcomeNotes || "Human intervention recorded.", emergencyId]
  );

  await db.query(
    `UPDATE notifications
     SET escalation_status = 'resolved',
         resolution_notes = ?,
         is_read = TRUE
     WHERE reference_type = 'emergency' AND reference_id = ?`,
    [outcomeNotes || "Resolved", emergencyId]
  );

  await recordAuditLog({
    actorId,
    actorRole,
    action: "EMERGENCY_RESOLVED",
    entityType: "emergency",
    entityId: Number(emergencyId),
    details: { outcomeNotes },
  });

  if (global.io) {
    global.io.to("counsellors-room").emit("emergencyUpdated", {
      emergencyId: Number(emergencyId),
      status: "Resolved",
      resolvedBy: actorId,
    });
    global.io.to("admin-room").emit("emergencyUpdated", {
      emergencyId: Number(emergencyId),
      status: "Resolved",
      resolvedBy: actorId,
    });
  }

  const [updated] = await db.query(`SELECT * FROM emergencies WHERE id = ?`, [emergencyId]);
  return updated[0];
}

/**
 * Escalates any unacknowledged emergencies older than `thresholdMinutes`.
 */
export async function escalateUnacknowledgedAlerts(thresholdMinutes = DEFAULT_ESCALATION_MINUTES) {
  const [overdue] = await db.query(
    `SELECT * FROM emergencies
     WHERE status = 'Pending_Acknowledgment'
       AND acknowledged_at IS NULL
       AND TIMESTAMPDIFF(MINUTE, COALESCE(escalated_at, created_at), NOW()) >= ?`,
    [thresholdMinutes]
  );

  const escalated = [];

  for (const alert of overdue) {
    const nextLevel = (alert.escalation_level || 0) + 1;
    await db.query(
      `UPDATE emergencies
       SET escalation_level = ?,
           escalated_at = NOW()
       WHERE id = ?`,
      [nextLevel, alert.id]
    );

    await db.query(
      `UPDATE notifications
       SET escalation_status = 'escalated'
       WHERE reference_type = 'emergency' AND reference_id = ?`,
      [alert.id]
    );

    await createNotification({
      userId: null,
      recipientRole: "admin",
      patientId: alert.student_id,
      category: "safety_escalation",
      title: `ESCALATED Alert #${alert.id} (Level ${nextLevel})`,
      message: `Unacknowledged high-risk alert for patient #${alert.student_id} exceeded ${thresholdMinutes}m response threshold.`,
      referenceType: "emergency",
      referenceId: alert.id,
      escalationStatus: "escalated",
    });

    await recordAuditLog({
      actorId: null,
      actorRole: "system",
      action: "EMERGENCY_ESCALATED",
      entityType: "emergency",
      entityId: alert.id,
      details: { escalationLevel: nextLevel, thresholdMinutes },
    });

    if (global.io) {
      global.io.to("admin-room").emit("emergencyEscalated", {
        emergencyId: alert.id,
        studentId: alert.student_id,
        escalationLevel: nextLevel,
        timestamp: new Date().toISOString(),
      });
      global.io.to("counsellors-room").emit("emergencyEscalated", {
        emergencyId: alert.id,
        studentId: alert.student_id,
        escalationLevel: nextLevel,
        timestamp: new Date().toISOString(),
      });
    }

    escalated.push({ id: alert.id, escalationLevel: nextLevel });
  }

  return escalated;
}
