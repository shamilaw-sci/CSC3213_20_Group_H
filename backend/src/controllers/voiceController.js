import { createLiveEphemeralSession } from "../services/liveVoiceService.js";
import {
  fetchConversationMessages,
  getOrCreateConversation,
  processPatientTurn,
} from "../services/screeningOrchestrator.js";
import { recordAuditLog } from "../utils/auditLogger.js";

export const createVoiceSession = async (req, res) => {
  const userId = req.user.id;
  const requestedConvId = req.body?.conversationId ? Number(req.body.conversationId) : null;

  let conversation;
  let recentHistory;
  try {
    conversation = await getOrCreateConversation(userId, requestedConvId, "voice");
    recentHistory = await fetchConversationMessages(userId, conversation.id, 10);
  } catch (dbError) {
    console.error("Database error preparing voice session:", dbError);
    return res.status(500).json({
      error: "Could not load voice conversation state. Ensure database migrations have been applied.",
      details: dbError.message,
    });
  }

  try {
    const liveSession = await createLiveEphemeralSession({
      conversationId: conversation.id,
      recentHistory,
    });

    await recordAuditLog({
      actorId: userId,
      actorRole: req.user.role,
      action: "VOICE_LIVE_SESSION_STARTED",
      entityType: "conversation",
      entityId: conversation.id,
      details: { model: liveSession.model, expiresAt: liveSession.expiresAt },
    });

    return res.status(201).json({
      ...liveSession,
      recentHistory,
    });
  } catch (error) {
    console.error("Failed to create Gemini Live session:", error);
    return res.status(503).json({
      error: "Could not initialize real-time Gemini Live voice session.",
      details: error.message,
    });
  }
};

/**
 * Shared safety & screening pipeline for voice conversation turns.
 * Ensures voice transcripts undergo the exact same risk validation, PHQ-9 linkage,
 * and emergency escalation workflow as text chat.
 */
export const recordVoiceTurn = async (req, res) => {
  const userId = req.user.id;
  const userTranscript = String(req.body?.userTranscript || "").trim();
  const assistantTranscript = String(req.body?.assistantTranscript || "").trim() || null;
  const conversationId = req.body?.conversationId ? Number(req.body.conversationId) : null;

  if (!userTranscript) {
    return res.status(400).json({ error: "userTranscript is required." });
  }

  if (userTranscript.length > 4000) {
    return res.status(400).json({ error: "userTranscript exceeds maximum length." });
  }

  try {
    const result = await processPatientTurn({
      userId,
      conversationId,
      userText: userTranscript,
      modality: "voice",
      precomputedBotReply: assistantTranscript,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Failed to process voice turn:", error);
    return res.status(500).json({ error: "Could not process voice conversation turn." });
  }
};
