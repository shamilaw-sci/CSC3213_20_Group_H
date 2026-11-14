import db from "../config/db.js";

/**
 * Persists an audit trail entry in `audit_logs` and mirrors to structured stdout.
 */
export async function recordAuditLog({
  actorId = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  details = null,
}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        actorId,
        actorRole,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log:", error.message);
  }

  console.log(
    `[AUDIT] actor=${actorId ?? "system"}(${actorRole ?? "n/a"}) action=${action} entity=${entityType}:${entityId ?? "-"}`
  );
}

// Preserve backwards-compatible helper used by earlier modules.
export const logAdminAction = async (adminId, actionType, targetDetails) => {
  await recordAuditLog({
    actorId: adminId,
    actorRole: "admin",
    action: actionType,
    entityType: "system",
    details: { targetDetails },
  });
};
