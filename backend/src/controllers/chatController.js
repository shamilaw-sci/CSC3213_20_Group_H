import db from "../config/db.js";
import { detectCrisis } from "../services/crisisDetector.js";
import { generateReply } from "../services/geminiService.js";

const HISTORY_LIMIT = 12;

const CRISIS_REPLY = `I'm really glad you told me this, and I want you to be safe. What you're feeling matters, and you don't have to go through it alone.

Please use the "Emergency Help" button on this page now — it connects you straight to an on-call counsellor. If you're in immediate danger, contact your local emergency number right away.

I'm still here to listen whenever you're ready to talk more.`;

const FALLBACK_REPLY =
  "I'm having a little trouble responding right now, but I'm still here with you. Could you try saying that again in a moment? If this is urgent, please use the Emergency Help button.";

async function fetchRecentMessages(userId) {
  const [rows] = await db.query(
    `SELECT sender, content, crisis_flag AS crisisFlag, created_at AS createdAt
     FROM chat_messages
     WHERE user_id = ?
     ORDER BY created_at ASC, id ASC
     LIMIT ?`,
    [userId, HISTORY_LIMIT]
  );
  return rows;
}

async function insertMessage(userId, sender, content, crisisFlag = false) {
  const [result] = await db.query(
    `INSERT INTO chat_messages (user_id, sender, content, crisis_flag) VALUES (?, ?, ?, ?)`,
    [userId, sender, content, crisisFlag]
  );

  return {
    id: result.insertId,
    sender,
    content,
    crisisFlag,
    createdAt: new Date().toISOString(),
  };
}

async function logCrisisEmergency(userId, message) {
  await db.query(
    `INSERT INTO emergencies (student_id, severity_score, description, fallback_triggered, status)
     VALUES (?, 'Critical', ?, TRUE, 'Pending_Acknowledgment')`,
    [userId, `Auto-detected crisis language in chat: "${message.slice(0, 200)}"`]
  );
}

export const getHistory = async (req, res) => {
  try {
    const messages = await fetchRecentMessages(req.user.id);
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return res.status(500).json({ error: "Could not load chat history." });
  }
};

export const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const { message } = req.body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  const trimmedMessage = message.trim();

  try {
    const history = await fetchRecentMessages(userId);
    const { crisis } = detectCrisis(trimmedMessage);

    const patientMessage = await insertMessage(
      userId,
      "patient",
      trimmedMessage,
      crisis
    );

    if (crisis) {
      const botMessage = await insertMessage(userId, "bot", CRISIS_REPLY, true);
      await logCrisisEmergency(userId, trimmedMessage).catch((err) =>
        console.error("Failed to log auto-detected crisis emergency:", err)
      );

      return res.status(201).json({
        crisisDetected: true,
        messages: [patientMessage, botMessage],
      });
    }

    let botReplyText;
    try {
      botReplyText = await generateReply(history, trimmedMessage);
    } catch (llmError) {
      console.error("Gemini reply failed:", llmError.message);
      botReplyText = FALLBACK_REPLY;
    }

    const botMessage = await insertMessage(userId, "bot", botReplyText, false);

    return res.status(201).json({
      crisisDetected: false,
      messages: [patientMessage, botMessage],
    });
  } catch (error) {
    console.error("Chat sendMessage failure:", error);
    return res.status(500).json({ error: "Could not process your message." });
  }
};
