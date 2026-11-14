import db from "../config/db.js";
import {
  PHQ9_QUESTIONS,
  PHQ9_RESPONSE_OPTIONS,
  Phq9ValidationError,
  calculatePhq9Summary,
  validatePhq9Answer,
} from "../services/phq9Service.js";
import { evaluateOperationalRisk } from "../services/riskEngine.js";
import {
  getOrCreateConversation,
  persistRiskAssessmentAndTrigger,
} from "../services/screeningOrchestrator.js";
import { recordAuditLog } from "../utils/auditLogger.js";

export const getPhq9Questions = (req, res) => {
  return res.status(200).json({
    questions: PHQ9_QUESTIONS,
    options: PHQ9_RESPONSE_OPTIONS,
    disclaimer:
      "The PHQ-9 is a validated depression screening questionnaire, not a clinical diagnosis.",
  });
};

export const startPhq9Screening = async (req, res) => {
  const userId = req.user.id;
  const requestedConvId = req.body?.conversationId ? Number(req.body.conversationId) : null;

  try {
    const conversation = await getOrCreateConversation(userId, requestedConvId, "text");

    const [existingInProgress] = await db.query(
      `SELECT id, current_question AS currentQuestion, created_at AS createdAt
       FROM phq9_screenings
       WHERE user_id = ? AND status = 'in_progress'
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    if (existingInProgress.length > 0 && !req.body?.forceNew) {
      const screening = existingInProgress[0];
      const [answers] = await db.query(
        `SELECT question_number AS questionNumber, response_value AS responseValue, response_label AS responseLabel
         FROM phq9_responses
         WHERE screening_id = ?
         ORDER BY question_number ASC`,
        [screening.id]
      );
      return res.status(200).json({
        screening: {
          id: screening.id,
          conversationId: conversation.id,
          status: "in_progress",
          currentQuestion: screening.currentQuestion,
          answers,
        },
        nextQuestion: PHQ9_QUESTIONS[screening.currentQuestion - 1] || null,
        options: PHQ9_RESPONSE_OPTIONS,
      });
    }

    if (existingInProgress.length > 0 && req.body?.forceNew) {
      await db.query(
        `UPDATE phq9_screenings SET status = 'abandoned' WHERE id = ?`,
        [existingInProgress[0].id]
      );
    }

    const [result] = await db.query(
      `INSERT INTO phq9_screenings (user_id, conversation_id, status, current_question)
       VALUES (?, ?, 'in_progress', 1)`,
      [userId, conversation.id]
    );

    return res.status(201).json({
      screening: {
        id: result.insertId,
        conversationId: conversation.id,
        status: "in_progress",
        currentQuestion: 1,
        answers: [],
      },
      nextQuestion: PHQ9_QUESTIONS[0],
      options: PHQ9_RESPONSE_OPTIONS,
    });
  } catch (error) {
    console.error("Failed to start PHQ-9 screening:", error);
    return res.status(500).json({ error: "Could not start PHQ-9 screening." });
  }
};

export const submitPhq9Answer = async (req, res) => {
  const userId = req.user.id;
  const screeningId = Number(req.params.screeningId);
  const questionNumber = Number(req.body?.questionNumber);
  const responseValue = Number(req.body?.responseValue);

  if (!Number.isInteger(screeningId) || screeningId <= 0) {
    return res.status(400).json({ error: "Invalid screeningId." });
  }

  try {
    const [screeningRows] = await db.query(
      `SELECT * FROM phq9_screenings WHERE id = ? AND user_id = ? LIMIT 1`,
      [screeningId, userId]
    );

    if (screeningRows.length === 0) {
      return res.status(404).json({ error: "PHQ-9 screening session not found." });
    }

    const screening = screeningRows[0];
    if (screening.status === "completed") {
      return res.status(400).json({ error: "This PHQ-9 screening is already completed." });
    }
    if (screening.status === "abandoned") {
      return res.status(400).json({ error: "This PHQ-9 screening is no longer active." });
    }

    const validated = validatePhq9Answer({
      questionNumber,
      responseValue,
      expectedQuestionNumber: screening.current_question,
    });

    await db.query(
      `INSERT INTO phq9_responses (screening_id, question_number, question_text, response_value, response_label)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         response_value = VALUES(response_value),
         response_label = VALUES(response_label),
         answered_at = CURRENT_TIMESTAMP`,
      [
        screeningId,
        validated.questionNumber,
        validated.questionText,
        validated.responseValue,
        validated.responseLabel,
      ]
    );

    // Question 9 requires an immediate separate safety workflow when >= 1.
    let q9SafetyResult = null;
    if (validated.isQuestion9Positive) {
      const q9Eval = evaluateOperationalRisk({
        userMessage: `PHQ-9 Question 9 response: ${validated.responseLabel} (${validated.responseValue}/3)`,
        phq9Q9Score: validated.responseValue,
      });

      q9SafetyResult = await persistRiskAssessmentAndTrigger({
        userId,
        conversationId: screening.conversation_id,
        modality: "phq9",
        evaluation: q9Eval,
        sourceExcerpt: `PHQ-9 Q9: ${validated.responseLabel}`,
      });
    }

    if (validated.questionNumber < 9) {
      const nextQuestionNumber = validated.questionNumber + 1;
      await db.query(
        `UPDATE phq9_screenings SET current_question = ?, q9_safety_triggered = GREATEST(q9_safety_triggered, ?) WHERE id = ?`,
        [nextQuestionNumber, validated.isQuestion9Positive ? 1 : 0, screeningId]
      );

      return res.status(200).json({
        completed: false,
        savedResponse: validated,
        nextQuestion: PHQ9_QUESTIONS[nextQuestionNumber - 1],
        options: PHQ9_RESPONSE_OPTIONS,
        q9SafetyTriggered: validated.isQuestion9Positive,
        crisisResources: q9SafetyResult?.crisisResources || null,
      });
    }

    // All 9 questions completed: compute total score purely in backend.
    const [allResponses] = await db.query(
      `SELECT question_number AS questionNumber, response_value AS responseValue, response_label AS responseLabel
       FROM phq9_responses
       WHERE screening_id = ?
       ORDER BY question_number ASC`,
      [screeningId]
    );

    const summary = calculatePhq9Summary(allResponses);

    await db.query(
      `UPDATE phq9_screenings
       SET total_score = ?,
           severity_band = ?,
           q9_score = ?,
           q9_safety_triggered = ?,
           status = 'completed',
           completed_at = NOW()
       WHERE id = ?`,
      [
        summary.totalScore,
        summary.severityBand,
        summary.q9Score,
        summary.q9SafetyTriggered ? 1 : 0,
        screeningId,
      ]
    );

    // Evaluate operational risk from PHQ-9 total score separately from immediate Q9 safety.
    let finalSafetyResult = q9SafetyResult;
    if (!summary.q9SafetyTriggered && summary.totalScore >= 10) {
      const scoreEval = evaluateOperationalRisk({
        phq9TotalScore: summary.totalScore,
        phq9Q9Score: summary.q9Score,
      });
      finalSafetyResult = await persistRiskAssessmentAndTrigger({
        userId,
        conversationId: screening.conversation_id,
        modality: "phq9",
        evaluation: scoreEval,
        sourceExcerpt: `Completed PHQ-9 score ${summary.totalScore}/27 (${summary.severityBand})`,
      });
    }

    await recordAuditLog({
      actorId: userId,
      actorRole: req.user.role,
      action: "PHQ9_COMPLETED",
      entityType: "phq9_screening",
      entityId: screeningId,
      details: {
        totalScore: summary.totalScore,
        severityBand: summary.severityBand,
        q9SafetyTriggered: summary.q9SafetyTriggered,
      },
    });

    return res.status(200).json({
      completed: true,
      screeningId,
      ...summary,
      responses: allResponses,
      crisisResources: finalSafetyResult?.crisisResources || null,
    });
  } catch (error) {
    if (error instanceof Phq9ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Failed to record PHQ-9 answer:", error);
    return res.status(500).json({ error: "Could not save PHQ-9 response." });
  }
};

export const getOwnPhq9History = async (req, res) => {
  try {
    const [screenings] = await db.query(
      `SELECT id, conversation_id AS conversationId, total_score AS totalScore,
              severity_band AS severityBand, q9_score AS q9Score,
              q9_safety_triggered AS q9SafetyTriggered, status,
              created_at AS createdAt, completed_at AS completedAt
       FROM phq9_screenings
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      screenings,
      disclaimer:
        "PHQ-9 screening results are supportive indicators, not a clinical diagnosis.",
    });
  } catch (error) {
    console.error("Failed to load PHQ-9 history:", error);
    return res.status(500).json({ error: "Could not load PHQ-9 history." });
  }
};

export const getPatientPhq9History = async (req, res) => {
  const patientId = Number(req.params.patientId);
  try {
    const [screenings] = await db.query(
      `SELECT id, conversation_id AS conversationId, total_score AS totalScore,
              severity_band AS severityBand, q9_score AS q9Score,
              q9_safety_triggered AS q9SafetyTriggered, status,
              created_at AS createdAt, completed_at AS completedAt
       FROM phq9_screenings
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [patientId]
    );

    for (const s of screenings) {
      const [responses] = await db.query(
        `SELECT question_number AS questionNumber, question_text AS questionText,
                response_value AS responseValue, response_label AS responseLabel, answered_at AS answeredAt
         FROM phq9_responses
         WHERE screening_id = ?
         ORDER BY question_number ASC`,
        [s.id]
      );
      s.responses = responses;
    }

    return res.status(200).json({ screenings });
  } catch (error) {
    console.error("Failed to load patient PHQ-9 history:", error);
    return res.status(500).json({ error: "Could not load patient PHQ-9 history." });
  }
};
