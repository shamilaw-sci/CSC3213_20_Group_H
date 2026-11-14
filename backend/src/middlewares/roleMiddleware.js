import db from "../config/db.js";

export function requireRoles(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const userRole = String(req.user.role).toLowerCase();
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Access forbidden: requires one of [${normalizedAllowed.join(", ")}].`,
      });
    }

    next();
  };
}

/**
 * Enforces patient-level access control:
 * - Patients may access only their own records.
 * - Admins & supervisors may access any patient record.
 * - Approved counsellors may access patients assigned to them or patients with active alerts/unassigned triage.
 */
export async function ensurePatientAccess(req, res, next) {
  const actorId = req.user?.id;
  const actorRole = String(req.user?.role || "").toLowerCase();
  const targetPatientId = Number(req.params.patientId || req.body?.patientId);

  if (!actorId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!Number.isInteger(targetPatientId) || targetPatientId <= 0) {
    return res.status(400).json({ error: "Valid patientId is required." });
  }

  if (["admin", "supervisor"].includes(actorRole)) {
    return next();
  }

  if (["student", "anonymous"].includes(actorRole)) {
    if (Number(actorId) === targetPatientId) {
      return next();
    }
    return res.status(403).json({ error: "Access forbidden to another patient's record." });
  }

  if (actorRole === "counsellor") {
    try {
      const [counsellorRows] = await db.query(
        `SELECT c.id, COALESCE(cp.verification_status, 'pending') AS verification_status
         FROM counsellors c
         LEFT JOIN counsellor_profiles cp ON cp.user_id = c.user_id
         WHERE c.user_id = ?
         LIMIT 1`,
        [actorId]
      );

      // Allow counsellor if assigned to this patient OR if this patient has an active alert/unassigned triage
      const counsellorId = counsellorRows[0]?.id || null;
      if (counsellorId) {
        const [assigned] = await db.query(
          `SELECT id FROM patient_assignments
           WHERE patient_id = ? AND counsellor_id = ? AND status = 'active' LIMIT 1`,
          [targetPatientId, counsellorId]
        );
        if (assigned.length > 0) {
          return next();
        }
      }

      const [unassignedOrAlerted] = await db.query(
        `SELECT u.id
         FROM users u
         LEFT JOIN patient_assignments pa ON pa.patient_id = u.id AND pa.status = 'active'
         WHERE u.id = ? AND pa.id IS NULL
         LIMIT 1`,
        [targetPatientId]
      );
      if (unassignedOrAlerted.length > 0) {
        return next();
      }

      return res.status(403).json({
        error: "Access forbidden: patient is assigned to another counsellor.",
      });
    } catch (error) {
      console.error("Patient access check failed:", error);
      return res.status(500).json({ error: "Failed to verify patient access." });
    }
  }

  return res.status(403).json({ error: "Access forbidden." });
}
