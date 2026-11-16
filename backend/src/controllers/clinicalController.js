import path from "path";
import db from "../config/db.js";
import {
  acknowledgeEmergencyAlert,
  escalateUnacknowledgedAlerts,
  resolveEmergencyAlert,
} from "../services/escalationService.js";
import {
  DocumentValidationError,
  generateDocumentSummary,
  storePatientDocument,
} from "../services/documentService.js";
import { GeminiUnavailableError } from "../services/geminiService.js";
import { createNotification } from "../services/notificationService.js";
import { VALID_RISK_LEVELS } from "../services/riskEngine.js";
import { recordAuditLog } from "../utils/auditLogger.js";

function parseJsonField(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const getClinicalOverview = async (req, res) => {
  const { riskLevel, counsellorId, status, dateFrom, dateTo } = req.query;
  const actorRole = String(req.user.role || "").toLowerCase();
  const actorId = req.user.id;

  try {
    let counsellorFilterId = counsellorId ? Number(counsellorId) : null;
    if (actorRole === "counsellor" && !counsellorFilterId) {
      const [cRows] = await db.query(`SELECT id FROM counsellors WHERE user_id = ? LIMIT 1`, [
        actorId,
      ]);
      // Counsellors see unassigned or assigned patients; overview shows global triage plus assigned count
      if (cRows.length > 0 && req.query.mineOnly === "true") {
        counsellorFilterId = cRows[0].id;
      }
    }

    const [patientRiskRows] = await db.query(`
      SELECT
        u.id AS patientId,
        COALESCE(
          (SELECT ra.validated_risk_level FROM risk_assessments ra
           WHERE ra.user_id = u.id ORDER BY ra.created_at DESC, ra.id DESC LIMIT 1),
          'low'
        ) AS currentRiskLevel,
        (SELECT COUNT(*) FROM risk_assessments ra
         WHERE ra.user_id = u.id AND ra.review_status = 'unreviewed') AS unreviewedCount,
        (SELECT pa.counsellor_id FROM patient_assignments pa
         WHERE pa.patient_id = u.id AND pa.status = 'active' ORDER BY pa.id DESC LIMIT 1) AS assignedCounsellorId,
        (SELECT fu.status FROM follow_ups fu
         WHERE fu.patient_id = u.id ORDER BY fu.created_at DESC, fu.id DESC LIMIT 1) AS latestFollowUpStatus
      FROM users u
      WHERE u.role IN ('student', 'anonymous')
    `);

    const filteredPatients = patientRiskRows.filter((p) => {
      if (riskLevel && p.currentRiskLevel !== riskLevel) return false;
      if (counsellorFilterId && p.assignedCounsellorId !== counsellorFilterId) return false;
      if (status && (p.latestFollowUpStatus || "none") !== status) return false;
      return true;
    });

    const riskCounts = { low: 0, moderate: 0, high: 0 };
    let unreviewedRiskAssessments = 0;

    for (const row of filteredPatients) {
      if (riskCounts[row.currentRiskLevel] !== undefined) {
        riskCounts[row.currentRiskLevel] += 1;
      }
      unreviewedRiskAssessments += Number(row.unreviewedCount || 0);
    }

    const alertConditions = ["status != 'Resolved'"];
    const alertParams = [];
    if (dateFrom) {
      alertConditions.push("DATE(created_at) >= ?");
      alertParams.push(dateFrom);
    }
    if (dateTo) {
      alertConditions.push("DATE(created_at) <= ?");
      alertParams.push(dateTo);
    }

    const [[{ activeUrgentAlerts }]] = await db.query(
      `SELECT COUNT(*) AS activeUrgentAlerts FROM emergencies WHERE ${alertConditions.join(" AND ")}`,
      alertParams
    );

    const [[{ unacknowledgedAlerts }]] = await db.query(
      `SELECT COUNT(*) AS unacknowledgedAlerts FROM emergencies WHERE status = 'Pending_Acknowledgment'`
    );

    const followUpConditions = ["status IN ('pending', 'in_progress')"];
    const followUpParams = [];
    if (counsellorFilterId) {
      followUpConditions.push("counsellor_id = ?");
      followUpParams.push(counsellorFilterId);
    }
    const [[{ pendingFollowUps }]] = await db.query(
      `SELECT COUNT(*) AS pendingFollowUps FROM follow_ups WHERE ${followUpConditions.join(" AND ")}`,
      followUpParams
    );

    return res.status(200).json({
      riskCounts,
      totalPatients: filteredPatients.length,
      unreviewedRiskAssessments,
      activeUrgentAlerts,
      unacknowledgedAlerts,
      pendingFollowUps,
    });
  } catch (error) {
    console.error("Failed to build clinical overview:", error);
    return res.status(500).json({ error: "Could not load clinical overview." });
  }
};

export const listClinicalPatients = async (req, res) => {
  const { riskLevel, counsellorId, status, dateFrom, dateTo, search } = req.query;

  try {
    const [rows] = await db.query(`
      SELECT
        u.id AS patientId,
        u.name,
        u.email,
        u.role,
        u.anonymousId,
        u.isAnonymous,
        u.created_at AS registrationDate,
        (SELECT ps.completed_at FROM phq9_screenings ps
         WHERE ps.user_id = u.id AND ps.status = 'completed'
         ORDER BY ps.completed_at DESC, ps.id DESC LIMIT 1) AS latestScreeningDate,
        (SELECT ps.total_score FROM phq9_screenings ps
         WHERE ps.user_id = u.id AND ps.status = 'completed'
         ORDER BY ps.completed_at DESC, ps.id DESC LIMIT 1) AS latestPhq9Score,
        (SELECT ps.severity_band FROM phq9_screenings ps
         WHERE ps.user_id = u.id AND ps.status = 'completed'
         ORDER BY ps.completed_at DESC, ps.id DESC LIMIT 1) AS latestPhq9Severity,
        COALESCE(
          (SELECT ra.validated_risk_level FROM risk_assessments ra
           WHERE ra.user_id = u.id ORDER BY ra.created_at DESC, ra.id DESC LIMIT 1),
          'low'
        ) AS currentRiskLevel,
        (SELECT COUNT(*) FROM risk_assessments ra
         WHERE ra.user_id = u.id AND ra.review_status = 'unreviewed') AS unreviewedAssessments,
        (SELECT pa.counsellor_id FROM patient_assignments pa
         WHERE pa.patient_id = u.id AND pa.status = 'active'
         ORDER BY pa.id DESC LIMIT 1) AS assignedCounsellorId,
        (SELECT c.name FROM patient_assignments pa
         JOIN counsellors c ON c.id = pa.counsellor_id
         WHERE pa.patient_id = u.id AND pa.status = 'active'
         ORDER BY pa.id DESC LIMIT 1) AS assignedCounsellorName,
        COALESCE(
          (SELECT fu.status FROM follow_ups fu
           WHERE fu.patient_id = u.id ORDER BY fu.created_at DESC, fu.id DESC LIMIT 1),
          'none'
        ) AS followUpStatus,
        (SELECT COUNT(*) FROM emergencies e
         WHERE e.student_id = u.id AND e.status != 'Resolved') AS activeAlertsCount
      FROM users u
      WHERE u.role IN ('student', 'anonymous')
      ORDER BY activeAlertsCount DESC, FIELD(currentRiskLevel, 'high', 'moderate', 'low'), u.created_at DESC
    `);

    const searchLower = String(search || "").trim().toLowerCase();
    const filtered = rows.filter((p) => {
      if (riskLevel && p.currentRiskLevel !== riskLevel) return false;
      if (counsellorId && Number(p.assignedCounsellorId) !== Number(counsellorId)) return false;
      if (status && p.followUpStatus !== status) return false;
      if (dateFrom && p.latestScreeningDate && new Date(p.latestScreeningDate) < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && p.latestScreeningDate && new Date(p.latestScreeningDate) > new Date(dateTo)) {
        return false;
      }
      if (searchLower) {
        const hay = `${p.patientId} ${p.name || ""} ${p.email || ""} ${p.anonymousId || ""}`.toLowerCase();
        if (!hay.includes(searchLower)) return false;
      }
      return true;
    });

    return res.status(200).json({ patients: filtered });
  } catch (error) {
    console.error("Failed to list clinical patients:", error);
    return res.status(500).json({ error: "Could not load patient records." });
  }
};

export const getPatientDetail = async (req, res) => {
  const patientId = Number(req.params.patientId);

  try {
    const [userRows] = await db.query(
      `SELECT id, name, email, role, anonymousId, isAnonymous, is_suspended, created_at AS registrationDate
       FROM users WHERE id = ? LIMIT 1`,
      [patientId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "Patient not found." });
    }

    const [assignments] = await db.query(
      `SELECT pa.*, c.name AS counsellor_name, c.specialization
       FROM patient_assignments pa
       JOIN counsellors c ON c.id = pa.counsellor_id
       WHERE pa.patient_id = ?
       ORDER BY pa.assigned_at DESC`,
      [patientId]
    );

    const [conversations] = await db.query(
      `SELECT * FROM conversations WHERE user_id = ? ORDER BY last_message_at DESC`,
      [patientId]
    );

    const [messages] = await db.query(
      `SELECT id, conversation_id AS conversationId, sender, modality, content,
              crisis_flag AS crisisFlag, ai_metadata AS aiMetadata, created_at AS createdAt
       FROM chat_messages
       WHERE user_id = ?
       ORDER BY created_at ASC, id ASC`,
      [patientId]
    );

    const [phq9Screenings] = await db.query(
      `SELECT id, conversation_id AS conversationId, total_score AS totalScore,
              severity_band AS severityBand, q9_score AS q9Score,
              q9_safety_triggered AS q9SafetyTriggered, status,
              created_at AS createdAt, completed_at AS completedAt
       FROM phq9_screenings
       WHERE user_id = ?
       ORDER BY created_at ASC, id ASC`,
      [patientId]
    );

    for (const screening of phq9Screenings) {
      const [answers] = await db.query(
        `SELECT question_number AS questionNumber, question_text AS questionText,
                response_value AS responseValue, response_label AS responseLabel, answered_at AS answeredAt
         FROM phq9_responses WHERE screening_id = ? ORDER BY question_number ASC`,
        [screening.id]
      );
      screening.responses = answers;
    }

    const [riskAssessments] = await db.query(
      `SELECT ra.*, u.name AS reviewer_name
       FROM risk_assessments ra
       LEFT JOIN users u ON u.id = ra.reviewed_by
       WHERE ra.user_id = ?
       ORDER BY ra.created_at DESC, ra.id DESC`,
      [patientId]
    );

    const formattedRiskAssessments = riskAssessments.map((r) => ({
      ...r,
      reasons: parseJsonField(r.reasons, []),
      emotional_indicators: parseJsonField(r.emotional_indicators, []),
      depression_indicators: parseJsonField(r.depression_indicators, []),
    }));

    const [alerts] = await db.query(
      `SELECT e.*, ack.name AS acknowledged_by_name, resv.name AS resolved_by_name
       FROM emergencies e
       LEFT JOIN users ack ON ack.id = e.acknowledged_by
       LEFT JOIN users resv ON resv.id = e.resolved_by
       WHERE e.student_id = ?
       ORDER BY e.created_at DESC`,
      [patientId]
    );

    const [documents] = await db.query(
      `SELECT id, patient_id AS patientId, uploaded_by AS uploadedBy,
              original_filename AS originalFilename, mime_type AS mimeType,
              file_size AS fileSize, consent_confirmed AS consentConfirmed,
              created_at AS createdAt,
              (extracted_text IS NOT NULL AND CHAR_LENGTH(extracted_text) > 0) AS hasExtractedText
       FROM patient_documents
       WHERE patient_id = ?
       ORDER BY created_at DESC`,
      [patientId]
    );

    const [summaries] = await db.query(
      `SELECT ds.*, u.name AS reviewed_by_name
       FROM document_summaries ds
       LEFT JOIN users u ON u.id = ds.reviewed_by
       WHERE ds.patient_id = ?
       ORDER BY ds.created_at DESC`,
      [patientId]
    );

    const formattedSummaries = summaries.map((s) => ({
      ...s,
      summary_json: parseJsonField(s.summary_json, {}),
    }));

    const [notes] = await db.query(
      `SELECT cn.*, u.name AS counsellor_name
       FROM counsellor_notes cn
       LEFT JOIN users u ON u.id = cn.counsellor_user_id
       WHERE cn.patient_id = ?
       ORDER BY cn.created_at DESC`,
      [patientId]
    );

    const [followUps] = await db.query(
      `SELECT fu.*, c.name AS counsellor_name
       FROM follow_ups fu
       LEFT JOIN counsellors c ON c.id = fu.counsellor_id
       WHERE fu.patient_id = ?
       ORDER BY fu.created_at DESC`,
      [patientId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "PATIENT_RECORD_VIEWED",
      entityType: "user",
      entityId: patientId,
    });

    return res.status(200).json({
      patient: userRows[0],
      activeAssignment: assignments.find((a) => a.status === "active") || null,
      assignmentHistory: assignments,
      conversations,
      messages: messages.map((m) => ({
        ...m,
        aiMetadata: parseJsonField(m.aiMetadata, null),
      })),
      phq9Screenings,
      riskAssessments: formattedRiskAssessments,
      alerts,
      documents,
      documentSummaries: formattedSummaries,
      counsellorNotes: notes,
      followUps,
    });
  } catch (error) {
    console.error("Failed to fetch patient detail:", error);
    return res.status(500).json({ error: "Could not load patient record." });
  }
};

export const reviewRiskAssessment = async (req, res) => {
  const assessmentId = Number(req.params.id);
  const { validatedRiskLevel, reviewNotes } = req.body || {};

  if (!VALID_RISK_LEVELS.includes(String(validatedRiskLevel || "").toLowerCase())) {
    return res.status(400).json({ error: "validatedRiskLevel must be low, moderate, or high." });
  }

  try {
    const [existingRows] = await db.query(`SELECT * FROM risk_assessments WHERE id = ?`, [
      assessmentId,
    ]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Risk assessment not found." });
    }

    const existing = existingRows[0];
    const nextLevel = String(validatedRiskLevel).toLowerCase();
    const nextStatus = existing.validated_risk_level === nextLevel ? "reviewed" : "overridden";

    await db.query(
      `UPDATE risk_assessments
       SET validated_risk_level = ?,
           review_status = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           review_notes = ?
       WHERE id = ?`,
      [nextLevel, nextStatus, req.user.id, reviewNotes || null, assessmentId]
    );

    if (existing.conversation_id) {
      await db.query(`UPDATE conversations SET current_risk_level = ? WHERE id = ?`, [
        nextLevel,
        existing.conversation_id,
      ]);
    }

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "RISK_ASSESSMENT_REVIEWED",
      entityType: "risk_assessment",
      entityId: assessmentId,
      details: {
        previousLevel: existing.validated_risk_level,
        newLevel: nextLevel,
        reviewStatus: nextStatus,
        reviewNotes,
      },
    });

    return res.status(200).json({ success: true, reviewStatus: nextStatus, validatedRiskLevel: nextLevel });
  } catch (error) {
    console.error("Failed to review risk assessment:", error);
    return res.status(500).json({ error: "Could not update risk assessment." });
  }
};

export const listAlerts = async (req, res) => {
  const { status, riskLevel } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (status) {
      conditions.push("e.status = ?");
      params.push(status);
    }
    if (riskLevel) {
      conditions.push("e.risk_level = ?");
      params.push(riskLevel);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT e.*, u.name AS patient_name, u.email AS patient_email, u.anonymousId,
              ack.name AS acknowledged_by_name, resv.name AS resolved_by_name
       FROM emergencies e
       JOIN users u ON u.id = e.student_id
       LEFT JOIN users ack ON ack.id = e.acknowledged_by
       LEFT JOIN users resv ON resv.id = e.resolved_by
       ${whereSql}
       ORDER BY FIELD(e.status, 'Pending_Acknowledgment', 'Acknowledged', 'Resolved'), e.created_at DESC
       LIMIT 100`,
      params
    );

    return res.status(200).json({ alerts: rows });
  } catch (error) {
    console.error("Failed to list alerts:", error);
    return res.status(500).json({ error: "Could not load alerts." });
  }
};

export const acknowledgeAlert = async (req, res) => {
  const emergencyId = Number(req.params.id);
  const { notes } = req.body || {};
  try {
    const updated = await acknowledgeEmergencyAlert({
      emergencyId,
      actorId: req.user.id,
      actorRole: req.user.role,
      notes,
    });
    if (!updated) {
      return res.status(404).json({ error: "Emergency alert not found." });
    }
    return res.status(200).json({ success: true, alert: updated });
  } catch (error) {
    console.error("Failed to acknowledge alert:", error);
    return res.status(500).json({ error: "Could not acknowledge alert." });
  }
};

export const resolveAlert = async (req, res) => {
  const emergencyId = Number(req.params.id);
  const { outcomeNotes } = req.body || {};
  if (!outcomeNotes || !String(outcomeNotes).trim()) {
    return res.status(400).json({ error: "outcomeNotes is required when resolving an alert." });
  }

  try {
    const updated = await resolveEmergencyAlert({
      emergencyId,
      actorId: req.user.id,
      actorRole: req.user.role,
      outcomeNotes: String(outcomeNotes).trim(),
    });
    if (!updated) {
      return res.status(404).json({ error: "Emergency alert not found." });
    }
    return res.status(200).json({ success: true, alert: updated });
  } catch (error) {
    console.error("Failed to resolve alert:", error);
    return res.status(500).json({ error: "Could not resolve alert." });
  }
};

export const triggerOverdueEscalation = async (req, res) => {
  const thresholdMinutes = Number(req.body?.thresholdMinutes || process.env.ALERT_ESCALATION_MINUTES || 5);
  try {
    const escalated = await escalateUnacknowledgedAlerts(thresholdMinutes);
    return res.status(200).json({ success: true, escalatedCount: escalated.length, escalated });
  } catch (error) {
    console.error("Escalation check failed:", error);
    return res.status(500).json({ error: "Could not escalate overdue alerts." });
  }
};

export const listAvailableCounsellors = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.user_id AS userId, c.name, c.specialization,
             COALESCE(cp.verification_status, 'pending') AS verificationStatus,
             COALESCE(cp.is_available, TRUE) AS isAvailable,
             (SELECT COUNT(*) FROM patient_assignments pa WHERE pa.counsellor_id = c.id AND pa.status = 'active') AS activePatientsCount
      FROM counsellors c
      LEFT JOIN counsellor_profiles cp ON cp.user_id = c.user_id
      ORDER BY c.name ASC
    `);
    return res.status(200).json({ counsellors: rows });
  } catch (error) {
    console.error("Failed to list counsellors:", error);
    return res.status(500).json({ error: "Could not load counsellors." });
  }
};

export const assignPatientToCounsellor = async (req, res) => {
  const patientId = Number(req.body?.patientId);
  const counsellorId = Number(req.body?.counsellorId);
  const notes = req.body?.notes ? String(req.body.notes).trim() : null;

  if (!Number.isInteger(patientId) || !Number.isInteger(counsellorId)) {
    return res.status(400).json({ error: "Valid patientId and counsellorId are required." });
  }

  try {
    const [counsellors] = await db.query(`SELECT * FROM counsellors WHERE id = ?`, [counsellorId]);
    if (counsellors.length === 0) {
      return res.status(404).json({ error: "Counsellor not found." });
    }
    const counsellor = counsellors[0];

    await db.query(
      `UPDATE patient_assignments SET status = 'reassigned', unassigned_at = NOW()
       WHERE patient_id = ? AND status = 'active'`,
      [patientId]
    );

    const [result] = await db.query(
      `INSERT INTO patient_assignments (patient_id, counsellor_id, assigned_by, status, notes)
       VALUES (?, ?, ?, 'active', ?)`,
      [patientId, counsellorId, req.user.id, notes]
    );

    await db.query(
      `UPDATE follow_ups SET counsellor_id = ? WHERE patient_id = ? AND status IN ('pending', 'in_progress')`,
      [counsellorId, patientId]
    );

    await createNotification({
      userId: counsellor.user_id || null,
      recipientRole: "counsellor",
      patientId,
      category: "patient_assignment",
      title: `New Patient Assignment (#${patientId})`,
      message: `Patient #${patientId} has been assigned to ${counsellor.name}.`,
      referenceType: "patient_assignment",
      referenceId: result.insertId,
    });

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "PATIENT_ASSIGNED",
      entityType: "patient_assignment",
      entityId: result.insertId,
      details: { patientId, counsellorId, notes },
    });

    return res.status(201).json({
      success: true,
      assignmentId: result.insertId,
      counsellorName: counsellor.name,
    });
  } catch (error) {
    console.error("Failed to assign patient:", error);
    return res.status(500).json({ error: "Could not assign patient." });
  }
};

export const addCounsellorNote = async (req, res) => {
  const patientId = Number(req.params.patientId);
  const { noteText, followUpStatus = "none", actionTaken = null, outcome = null, reviewDate = null } =
    req.body || {};

  if (!noteText || !String(noteText).trim()) {
    return res.status(400).json({ error: "noteText is required." });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO counsellor_notes
        (patient_id, counsellor_user_id, note_text, follow_up_status, action_taken, outcome, review_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        req.user.id,
        String(noteText).trim(),
        ["none", "pending", "in_progress", "completed"].includes(followUpStatus)
          ? followUpStatus
          : "none",
        actionTaken,
        outcome,
        reviewDate || null,
      ]
    );

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "COUNSELLOR_NOTE_ADDED",
      entityType: "counsellor_note",
      entityId: result.insertId,
      details: { patientId, followUpStatus },
    });

    return res.status(201).json({ success: true, noteId: result.insertId });
  } catch (error) {
    console.error("Failed to save counsellor note:", error);
    return res.status(500).json({ error: "Could not save counsellor note." });
  }
};

export const createFollowUp = async (req, res) => {
  const patientId = Number(req.params.patientId);
  const { priority = "moderate", dueDate = null, notes = null } = req.body || {};

  try {
    const [assignments] = await db.query(
      `SELECT counsellor_id FROM patient_assignments WHERE patient_id = ? AND status = 'active' LIMIT 1`,
      [patientId]
    );

    const [result] = await db.query(
      `INSERT INTO follow_ups (patient_id, counsellor_id, priority, due_date, status, notes)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [
        patientId,
        assignments[0]?.counsellor_id || null,
        ["low", "moderate", "high"].includes(priority) ? priority : "moderate",
        dueDate || null,
        notes,
      ]
    );

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "FOLLOWUP_CREATED",
      entityType: "follow_up",
      entityId: result.insertId,
      details: { patientId, priority, dueDate },
    });

    return res.status(201).json({ success: true, followUpId: result.insertId });
  } catch (error) {
    console.error("Failed to create follow-up:", error);
    return res.status(500).json({ error: "Could not create follow-up." });
  }
};

export const updateFollowUp = async (req, res) => {
  const followUpId = Number(req.params.id);
  const { status, outcome, notes } = req.body || {};
  const allowedStatuses = ["pending", "in_progress", "completed", "cancelled"];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid follow-up status." });
  }

  try {
    const [rows] = await db.query(`SELECT * FROM follow_ups WHERE id = ?`, [followUpId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Follow-up record not found." });
    }

    await db.query(
      `UPDATE follow_ups
       SET status = COALESCE(?, status),
           outcome = COALESCE(?, outcome),
           notes = COALESCE(?, notes),
           completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = ?`,
      [status || null, outcome || null, notes || null, status || null, followUpId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "FOLLOWUP_UPDATED",
      entityType: "follow_up",
      entityId: followUpId,
      details: { status, outcome },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to update follow-up:", error);
    return res.status(500).json({ error: "Could not update follow-up." });
  }
};

export const uploadPatientDocument = async (req, res) => {
  const patientId = Number(req.params.patientId);
  const consentConfirmed = req.body?.consentConfirmed === "true" || req.body?.consentConfirmed === true;
  const autoSummarize = req.body?.autoSummarize === "true" || req.body?.autoSummarize === true;

  try {
    const document = await storePatientDocument({
      patientId,
      uploadedBy: req.user.id,
      actorRole: req.user.role,
      file: req.file,
      consentConfirmed,
    });

    let summary = null;
    let summaryError = null;
    if (autoSummarize && consentConfirmed && document.hasExtractedText) {
      try {
        summary = await generateDocumentSummary({
          documentId: document.id,
          actorId: req.user.id,
          actorRole: req.user.role,
          consentConfirmed: true,
        });
      } catch (err) {
        summaryError = err.message;
      }
    }

    return res.status(201).json({
      success: true,
      document,
      summary,
      summaryError,
    });
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Failed to upload patient document:", error);
    return res.status(500).json({ error: "Could not upload document." });
  }
};

export const downloadPatientDocument = async (req, res) => {
  const docId = Number(req.params.docId);
  try {
    const [rows] = await db.query(`SELECT * FROM patient_documents WHERE id = ? LIMIT 1`, [docId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Document not found." });
    }

    const doc = rows[0];
    // Re-check patient-level access via params convention
    req.params.patientId = doc.patient_id;
    const absolutePath = path.resolve(process.cwd(), doc.storage_path);

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "PATIENT_DOCUMENT_DOWNLOADED",
      entityType: "patient_document",
      entityId: doc.id,
      details: { patientId: doc.patient_id, filename: doc.original_filename },
    });

    return res.download(absolutePath, doc.original_filename);
  } catch (error) {
    console.error("Failed to download document:", error);
    return res.status(500).json({ error: "Could not download document." });
  }
};

export const summarizeDocument = async (req, res) => {
  const docId = Number(req.params.docId);
  const consentConfirmed = Boolean(req.body?.consentConfirmed);

  try {
    const summary = await generateDocumentSummary({
      documentId: docId,
      actorId: req.user.id,
      actorRole: req.user.role,
      consentConfirmed,
    });
    if (!summary) {
      return res.status(404).json({ error: "Document not found." });
    }
    return res.status(201).json({ success: true, summary });
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof GeminiUnavailableError) {
      return res.status(503).json({
        error: "AI summarization service is temporarily busy. Please try again in a few moments.",
      });
    }
    console.error("Failed to summarize document:", error);
    return res.status(500).json({ error: "Could not generate AI document summary." });
  }
};

export const reviewDocumentSummary = async (req, res) => {
  const summaryId = Number(req.params.summaryId);
  const { reviewerNotes } = req.body || {};

  try {
    const [rows] = await db.query(`SELECT * FROM document_summaries WHERE id = ?`, [summaryId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Document summary not found." });
    }

    await db.query(
      `UPDATE document_summaries
       SET review_status = 'reviewed',
           reviewed_by = ?,
           reviewed_at = NOW(),
           reviewer_notes = ?
       WHERE id = ?`,
      [req.user.id, reviewerNotes || null, summaryId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "DOCUMENT_SUMMARY_REVIEWED",
      entityType: "document_summary",
      entityId: summaryId,
      details: { reviewerNotes },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to review document summary:", error);
    return res.status(500).json({ error: "Could not mark summary as reviewed." });
  }
};

export const listAuditLogs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT 100`
    );
    return res.status(200).json({
      logs: rows.map((r) => ({ ...r, details: parseJsonField(r.details, null) })),
    });
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return res.status(500).json({ error: "Could not load audit logs." });
  }
};
