import db from "../config/db.js";
import { detectCrisis } from "./crisisDetector.js";
import { generateStructuredSupportReply } from "./geminiService.js";
import {
  evaluateOperationalRisk,
  getConfiguredCrisisResources,
  maxRiskLevel,
} from "./riskEngine.js";
import { notifyAssignedOrOnCallCounsellors } from "./notificationService.js";
import { recordAuditLog } from "../utils/auditLogger.js";

const HISTORY_LIMIT = 20;

const FALLBACK_SUPPORT_REPLY =
  "I'm having a brief connection issue right now, but I'm still here with you. Please try sending that again in a moment. If you are feeling unsafe or need immediate help, please use the Emergency Help button or contact a local helpline right away.";

export function buildHighRiskSafetyReply(language = "en") {
  if (language === "si") {
    return `ඔබ මේ මොහොතේ අත්විඳින වේදනාව මට ඉතා වැදගත්, ඔබ ආරක්ෂිතව සිටීම මට අවශ්‍යයි. ඔබ මෙය තනිවම විඳදරාගත යුතු නැහැ.

කරුණාකර මට කියන්න: ඔබ දැන් ආරක්ෂිත ස්ථානයකද ඉන්නේ, ඔබ ළඟ රැඳී සිටිය හැකි විශ්වාසවන්ත කෙනෙක් ඉන්නවාද?

ඔබට ක්ෂණික අනතුරක් දැනේ නම්, කරුණාකර වහාම 119 හදිසි සේවාවට අමතන්න, ළඟම ඇති රෝහලේ හදිසි ප්‍රතිකාර ඒකකයට යන්න, හෝ 1926 (ජාතික මානසික සෞඛ්‍ය උපකාරක සේවාව) / 1333 අමතන්න. මෙම පිටුවේ ඇති "Emergency Help" බොත්තම හරහාද CareBridge උපදේශකවරයෙකුට දැන්ම දැනුම් දිය හැකිය.`;
  }

  return `I'm really glad you shared this with me, and your safety matters deeply right now. You don't have to carry this alone.

Are you in a safe place right now, and is there a trusted friend, family member, or roommate who can stay with you?

If you are in immediate danger or might act on these thoughts, please call local emergency services (119) or go to the nearest hospital emergency department right away. You can also call 1926 (National Mental Health Helpline) or 1333 (CCCline) at any time, and I've alerted a CareBridge counsellor to review this urgently.`;
}

export async function getOrCreateConversation(userId, conversationId = null, modality = "text") {
  if (conversationId) {
    const [rows] = await db.query(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1`,
      [conversationId, userId]
    );
    if (rows.length > 0) {
      const existing = rows[0];
      const nextModality =
        existing.modality !== modality && existing.modality !== "mixed" ? "mixed" : existing.modality;
      if (nextModality !== existing.modality) {
        await db.query(`UPDATE conversations SET modality = ? WHERE id = ?`, [nextModality, existing.id]);
        existing.modality = nextModality;
      }
      return existing;
    }
  }

  const [recent] = await db.query(
    `SELECT * FROM conversations
     WHERE user_id = ? AND status = 'active'
     ORDER BY last_message_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );

  if (recent.length > 0 && !conversationId) {
    const existing = recent[0];
    const nextModality =
      existing.modality !== modality && existing.modality !== "mixed" ? "mixed" : existing.modality;
    if (nextModality !== existing.modality) {
      await db.query(`UPDATE conversations SET modality = ? WHERE id = ?`, [nextModality, existing.id]);
      existing.modality = nextModality;
    }
    return existing;
  }

  const [result] = await db.query(
    `INSERT INTO conversations (user_id, title, modality) VALUES (?, ?, ?)`,
    [userId, modality === "voice" ? "Voice Support Session" : "Support Conversation", modality]
  );

  const [created] = await db.query(`SELECT * FROM conversations WHERE id = ?`, [result.insertId]);
  return created[0];
}

export async function createConversation(userId, title = "Support Conversation", modality = "text") {
  const [result] = await db.query(
    `INSERT INTO conversations (user_id, title, modality) VALUES (?, ?, ?)`,
    [userId, title.slice(0, 191), modality]
  );
  const [created] = await db.query(`SELECT * FROM conversations WHERE id = ?`, [result.insertId]);
  return created[0];
}

export async function fetchConversationMessages(userId, conversationId = null, limit = HISTORY_LIMIT) {
  const params = [userId];
  let whereClause = "WHERE user_id = ?";
  if (conversationId) {
    whereClause += " AND (conversation_id = ? OR conversation_id IS NULL)";
    params.push(conversationId);
  }
  params.push(limit);

  const [rows] = await db.query(
    `SELECT id, conversation_id AS conversationId, sender, modality, content,
            crisis_flag AS crisisFlag, ai_metadata AS aiMetadata, created_at AS createdAt
     FROM (
       SELECT * FROM chat_messages
       ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ?
     ) sub
     ORDER BY created_at ASC, id ASC`,
    params
  );
  return rows;
}

export async function insertChatMessage({
  userId,
  conversationId,
  sender,
  modality = "text",
  content,
  crisisFlag = false,
  aiMetadata = null,
}) {
  const [result] = await db.query(
    `INSERT INTO chat_messages (user_id, conversation_id, sender, modality, content, crisis_flag, ai_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      conversationId,
      sender,
      modality,
      content,
      crisisFlag,
      aiMetadata ? JSON.stringify(aiMetadata) : null,
    ]
  );

  await db.query(`UPDATE conversations SET last_message_at = NOW() WHERE id = ?`, [conversationId]);

  return {
    id: result.insertId,
    conversationId,
    sender,
    modality,
    content,
    crisisFlag,
    aiMetadata,
    createdAt: new Date().toISOString(),
  };
}

function extractCoveredTopics(history) {
  const topics = new Set();
  for (const msg of history || []) {
    const meta =
      typeof msg.aiMetadata === "string"
        ? (() => {
            try {
              return JSON.parse(msg.aiMetadata);
            } catch {
              return null;
            }
          })()
        : msg.aiMetadata;
    if (meta && Array.isArray(meta.followUpTopicsCovered)) {
      meta.followUpTopicsCovered.forEach((t) => topics.add(t));
    }
  }
  return Array.from(topics);
}

async function fetchLatestPhq9(userId) {
  const [rows] = await db.query(
    `SELECT id, total_score AS totalScore, severity_band AS severityBand,
            q9_score AS q9Score, q9_safety_triggered AS q9SafetyTriggered, completed_at AS createdAt
     FROM phq9_screenings
     WHERE user_id = ? AND status = 'completed'
     ORDER BY completed_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function persistRiskAssessmentAndTrigger({
  userId,
  conversationId = null,
  messageId = null,
  modality = "text",
  evaluation,
  sourceExcerpt = "",
}) {
  const [riskResult] = await db.query(
    `INSERT INTO risk_assessments
      (user_id, conversation_id, message_id, modality, ai_suggested_level, validated_risk_level,
       reasons, emotional_indicators, depression_indicators, ai_confidence, uncertainty_flag, deterministic_override)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      conversationId,
      messageId,
      modality,
      evaluation.aiSuggestedLevel,
      evaluation.validatedRiskLevel,
      JSON.stringify(evaluation.reasons),
      JSON.stringify(evaluation.emotionalIndicators),
      JSON.stringify(evaluation.depressionIndicators),
      evaluation.aiConfidence,
      evaluation.uncertaintyFlag,
      evaluation.deterministicOverride,
    ]
  );

  const riskAssessmentId = riskResult.insertId;

  if (conversationId) {
    const [convRows] = await db.query(`SELECT current_risk_level FROM conversations WHERE id = ?`, [
      conversationId,
    ]);
    const current = convRows[0]?.current_risk_level || "low";
    const nextLevel = maxRiskLevel(current, evaluation.validatedRiskLevel);
    await db.query(
      `UPDATE conversations SET current_risk_level = ?, detected_language = ? WHERE id = ?`,
      [nextLevel, evaluation.detectedLanguage || "en", conversationId]
    );
  }

  let emergencyAlert = null;
  let crisisResources = null;

  if (evaluation.validatedRiskLevel === "moderate") {
    const [openFollowUps] = await db.query(
      `SELECT id FROM follow_ups WHERE patient_id = ? AND status IN ('pending', 'in_progress') LIMIT 1`,
      [userId]
    );
    if (openFollowUps.length === 0) {
      const [assignments] = await db.query(
        `SELECT counsellor_id FROM patient_assignments WHERE patient_id = ? AND status = 'active' LIMIT 1`,
        [userId]
      );
      await db.query(
        `INSERT INTO follow_ups (patient_id, counsellor_id, risk_assessment_id, priority, due_date, status, notes)
         VALUES (?, ?, ?, 'moderate', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'pending', ?)`,
        [
          userId,
          assignments[0]?.counsellor_id || null,
          riskAssessmentId,
          evaluation.reasons.join(" "),
        ]
      );
    }

    await notifyAssignedOrOnCallCounsellors({
      patientId: userId,
      category: "moderate_risk_followup",
      title: `Moderate Risk Follow-Up: Patient #${userId}`,
      message: `Moderate screening priority flagged (${modality}): ${evaluation.reasons[0] || "Review recommended."}`,
      referenceType: "risk_assessment",
      referenceId: riskAssessmentId,
      escalationStatus: "pending",
    });
  }

  if (evaluation.validatedRiskLevel === "high" || evaluation.immediateSafetyConcern) {
    const description = `[${modality.toUpperCase()} SAFETY ALERT] ${evaluation.reasons.join(" ")} | Excerpt: "${String(
      sourceExcerpt || ""
    ).slice(0, 180)}"`;

    const [emResult] = await db.query(
      `INSERT INTO emergencies
        (student_id, conversation_id, severity_score, risk_level, description, ai_confidence, fallback_triggered, status)
       VALUES (?, ?, 'Critical', 'high', ?, ?, ?, 'Pending_Acknowledgment')`,
      [
        userId,
        conversationId,
        description,
        evaluation.aiConfidence,
        evaluation.deterministicOverride,
      ]
    );

    emergencyAlert = {
      emergencyId: emResult.insertId,
      studentId: userId,
      conversationId,
      severityScore: "Critical",
      riskLevel: "high",
      description,
      status: "Pending_Acknowledgment",
      timestamp: new Date().toISOString(),
    };

    if (global.io) {
      global.io.to("counsellors-room").emit("emergencyAlert", emergencyAlert);
      global.io.to("admin-room").emit("emergencyAlert", emergencyAlert);
    }

    await notifyAssignedOrOnCallCounsellors({
      patientId: userId,
      category: "high_risk_alert",
      title: `URGENT High-Risk Alert #${emResult.insertId}`,
      message: `Immediate safety review required for patient #${userId}: ${evaluation.reasons[0] || "High-risk disclosure detected."}`,
      referenceType: "emergency",
      referenceId: emResult.insertId,
      escalationStatus: "pending",
    });

    await recordAuditLog({
      actorId: userId,
      actorRole: "system",
      action: "HIGH_RISK_ALERT_TRIGGERED",
      entityType: "emergency",
      entityId: emResult.insertId,
      details: { modality, riskAssessmentId, reasons: evaluation.reasons },
    });

    crisisResources = getConfiguredCrisisResources();
  }

  return {
    riskAssessmentId,
    emergencyAlert,
    crisisResources,
  };
}

/**
 * Unified pipeline used by BOTH text chat and Gemini Live voice turns.
 */
export async function processPatientTurn({
  userId,
  conversationId = null,
  userText,
  modality = "text",
  precomputedBotReply = null,
}) {
  const conversation = await getOrCreateConversation(userId, conversationId, modality);
  const history = await fetchConversationMessages(userId, conversation.id);
  const deterministicPrecheck = detectCrisis(userText);
  const latestPhq9 = await fetchLatestPhq9(userId);
  const coveredTopics = extractCoveredTopics(history);

  const patientMessage = await insertChatMessage({
    userId,
    conversationId: conversation.id,
    sender: "patient",
    modality,
    content: userText,
    crisisFlag: deterministicPrecheck.crisis || deterministicPrecheck.uncertainSafety,
  });

  let aiStructuredOutput = null;
  let botReplyText = precomputedBotReply;

  if (deterministicPrecheck.crisis || deterministicPrecheck.uncertainSafety) {
    botReplyText = buildHighRiskSafetyReply(deterministicPrecheck.language);
  } else {
    try {
      const promptInput =
        modality === "voice" && precomputedBotReply
          ? `Patient spoken transcript: "${userText}"\nVoice assistant spoken reply: "${precomputedBotReply}"\nAnalyze the patient's message in context and provide the structured screening JSON.`
          : userText;

      aiStructuredOutput = await generateStructuredSupportReply({
        history,
        userMessage: promptInput,
        coveredTopics,
        latestPhq9,
      });

      if (!botReplyText) {
        botReplyText = aiStructuredOutput.reply;
      }
    } catch (llmError) {
      console.error("Gemini structured screening failed:", llmError.message);
      if (!botReplyText) {
        botReplyText = FALLBACK_SUPPORT_REPLY;
      }
    }
  }

  const evaluation = evaluateOperationalRisk({
    userMessage: userText,
    aiStructuredOutput,
    previousRiskLevel: conversation.current_risk_level,
  });

  // If AI / backend validation escalated to high risk even without deterministic precheck, ensure supportive safety reply.
  if (evaluation.validatedRiskLevel === "high" && modality === "text" && !deterministicPrecheck.crisis) {
    if (!botReplyText || botReplyText === FALLBACK_SUPPORT_REPLY) {
      botReplyText = buildHighRiskSafetyReply(evaluation.detectedLanguage);
    }
  }

  const botMessage = await insertChatMessage({
    userId,
    conversationId: conversation.id,
    sender: "bot",
    modality,
    content: botReplyText,
    crisisFlag: evaluation.validatedRiskLevel === "high",
    aiMetadata: {
      validatedRiskLevel: evaluation.validatedRiskLevel,
      emotionalIndicators: evaluation.emotionalIndicators,
      depressionIndicators: evaluation.depressionIndicators,
      uncertaintyFlag: evaluation.uncertaintyFlag,
      detectedLanguage: evaluation.detectedLanguage,
      recommendPhq9: evaluation.recommendPhq9,
      followUpTopicsCovered: evaluation.followUpTopicsCovered,
    },
  });

  const workflowResult = await persistRiskAssessmentAndTrigger({
    userId,
    conversationId: conversation.id,
    messageId: patientMessage.id,
    modality,
    evaluation,
    sourceExcerpt: userText,
  });

  return {
    conversationId: conversation.id,
    crisisDetected: evaluation.validatedRiskLevel === "high",
    riskAssessment: {
      id: workflowResult.riskAssessmentId,
      validatedRiskLevel: evaluation.validatedRiskLevel,
      aiSuggestedLevel: evaluation.aiSuggestedLevel,
      reasons: evaluation.reasons,
      emotionalIndicators: evaluation.emotionalIndicators,
      depressionIndicators: evaluation.depressionIndicators,
      uncertaintyFlag: evaluation.uncertaintyFlag,
      deterministicOverride: evaluation.deterministicOverride,
      recommendPhq9: evaluation.recommendPhq9,
      detectedLanguage: evaluation.detectedLanguage,
    },
    crisisResources: workflowResult.crisisResources,
    emergencyAlert: workflowResult.emergencyAlert,
    messages: [patientMessage, botMessage],
  };
}
