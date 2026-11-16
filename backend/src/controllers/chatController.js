import db from "../config/db.js";
import {
  createConversation,
  fetchConversationMessages,
  getOrCreateConversation,
  processPatientTurn,
} from "../services/screeningOrchestrator.js";

export const getConversations = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, modality, current_risk_level AS currentRiskLevel,
              detected_language AS detectedLanguage, started_at AS startedAt,
              last_message_at AS lastMessageAt, status
       FROM conversations
       WHERE user_id = ?
       ORDER BY last_message_at DESC, id DESC`,
      [req.user.id]
    );
    return res.status(200).json({ conversations: rows });
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return res.status(500).json({ error: "Could not load conversations." });
  }
};

export const startConversation = async (req, res) => {
  try {
    const title = String(req.body?.title || "Support Conversation").trim() || "Support Conversation";
    const modality = ["text", "voice", "mixed"].includes(req.body?.modality)
      ? req.body.modality
      : "text";
    const conversation = await createConversation(req.user.id, title, modality);
    return res.status(201).json({ conversation });
  } catch (error) {
    console.error("Failed to start conversation:", error);
    return res.status(500).json({ error: "Could not start a new conversation." });
  }
};

export const getHistory = async (req, res) => {
  try {
    const requestedConvId = req.query.conversationId ? Number(req.query.conversationId) : null;
    const conversation = await getOrCreateConversation(req.user.id, requestedConvId, "text");
    const messages = await fetchConversationMessages(req.user.id, conversation.id);

    const [activePhq9Rows] = await db.query(
      `SELECT id, current_question AS currentQuestion, status, created_at AS createdAt
       FROM phq9_screenings
       WHERE user_id = ? AND status = 'in_progress'
       ORDER BY id DESC LIMIT 1`,
      [req.user.id]
    );

    return res.status(200).json({
      conversationId: conversation.id,
      currentRiskLevel: conversation.current_risk_level,
      activePhq9: activePhq9Rows[0] || null,
      messages,
    });
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return res.status(500).json({ error: "Could not load chat history." });
  }
};

export const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const trimmedMessage = req.body.message;
  const conversationId = req.body.conversationId ? Number(req.body.conversationId) : null;

  try {
    const result = await processPatientTurn({
      userId,
      conversationId,
      userText: trimmedMessage,
      modality: "text",
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Chat sendMessage failure:", error);
    return res.status(500).json({ error: "Could not process your message." });
  }
};
