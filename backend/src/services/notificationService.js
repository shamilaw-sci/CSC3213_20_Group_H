import db from "../config/db.js";

/**
 * Creates a persistent notification for a specific user or role (e.g. 'counsellor', 'admin').
 * Emits real-time Socket.IO notification events when io is initialized.
 */
export async function createNotification({
  userId = null,
  recipientRole = null,
  patientId = null,
  category = "general",
  title = "CareBridge Notification",
  message,
  referenceType = null,
  referenceId = null,
  escalationStatus = "none",
}) {
  const [result] = await db.query(
    `INSERT INTO notifications
      (user_id, recipient_role, patient_id, category, title, message, reference_type, reference_id, escalation_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      recipientRole,
      patientId,
      category,
      title,
      message,
      referenceType,
      referenceId,
      escalationStatus,
    ]
  );

  const notification = {
    id: result.insertId,
    userId,
    recipientRole,
    patientId,
    category,
    title,
    message,
    referenceType,
    referenceId,
    escalationStatus,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  if (global.io) {
    if (recipientRole === "counsellor") {
      global.io.to("counsellors-room").emit("notification", notification);
    } else if (recipientRole === "admin" || recipientRole === "supervisor") {
      global.io.to("admin-room").emit("notification", notification);
    }
    if (userId) {
      global.io.to(`user-${userId}`).emit("notification", notification);
    }
  }

  return notification;
}

export async function notifyAssignedOrOnCallCounsellors({
  patientId,
  category,
  title,
  message,
  referenceType,
  referenceId,
  escalationStatus = "none",
}) {
  const [assignments] = await db.query(
    `SELECT c.user_id AS counsellor_user_id, c.id AS counsellor_id
     FROM patient_assignments pa
     JOIN counsellors c ON c.id = pa.counsellor_id
     WHERE pa.patient_id = ? AND pa.status = 'active' AND c.user_id IS NOT NULL
     LIMIT 1`,
    [patientId]
  );

  const assignedUserId = assignments[0]?.counsellor_user_id || null;

  const notification = await createNotification({
    userId: assignedUserId,
    recipientRole: "counsellor",
    patientId,
    category,
    title,
    message,
    referenceType,
    referenceId,
    escalationStatus,
  });

  if (category === "high_risk_alert" || category === "safety_escalation") {
    await createNotification({
      userId: null,
      recipientRole: "admin",
      patientId,
      category,
      title,
      message,
      referenceType,
      referenceId,
      escalationStatus,
    });
  }

  return notification;
}
