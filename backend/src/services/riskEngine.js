import { detectCrisis } from "./crisisDetector.js";

export const VALID_RISK_LEVELS = ["low", "moderate", "high"];

export const VALID_EMOTIONS = [
  "sadness",
  "anxiety",
  "stress",
  "frustration",
  "loneliness",
  "hopelessness",
  "emotional_distress",
  "positive_change",
];

export const VALID_DEPRESSION_INDICATORS = [
  "depressed_mood",
  "anhedonia",
  "sleep_changes",
  "appetite_changes",
  "fatigue",
  "concentration_difficulty",
  "worthlessness_guilt",
  "psychomotor_changes",
  "self_harm_or_death_thoughts",
];

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function getConfiguredCrisisResources() {
  return {
    disclaimer:
      "CareBridge provides supportive screening and cannot automatically contact emergency services on your behalf. If you are in immediate danger, please call local emergency services right away.",
    contacts: [
      {
        name: "National Mental Health Helpline (Sri Lanka)",
        number: process.env.CRISIS_HELPLINE_PRIMARY || "1926",
        availability: "24/7 toll-free",
      },
      {
        name: "CCCline Emotional Support",
        number: process.env.CRISIS_HELPLINE_SECONDARY || "1333",
        availability: "24/7 confidential support",
      },
      {
        name: "Sri Lanka Emergency Services",
        number: process.env.EMERGENCY_SERVICES_NUMBER || "119",
        availability: "Immediate emergency response",
      },
      {
        name: "University Counselling Support Desk",
        number: process.env.CAMPUS_COUNSELLING_CONTACT || "Use the Emergency Help button on screen",
        availability: "Notifies on-call CareBridge counsellor",
      },
    ],
  };
}

export function normalizeRiskLevel(level) {
  const normalized = String(level || "").trim().toLowerCase();
  return VALID_RISK_LEVELS.includes(normalized) ? normalized : null;
}

export function riskRank(level) {
  if (level === "high") return 3;
  if (level === "moderate") return 2;
  return 1;
}

export function maxRiskLevel(a, b) {
  return riskRank(a) >= riskRank(b) ? a : b;
}

export function validateAiScreeningOutput(rawOutput) {
  if (!rawOutput || typeof rawOutput !== "object") {
    return {
      valid: false,
      aiSuggestedLevel: null,
      emotionalIndicators: [],
      depressionIndicators: [],
      safetyConcern: false,
      safetyUncertainty: true,
      safetyReason: "Missing or invalid structured AI output",
      confidence: null,
      recommendPhq9: false,
      detectedLanguage: "en",
      followUpTopicsCovered: [],
    };
  }

  const aiSuggestedLevel = normalizeRiskLevel(rawOutput.suggestedRiskLevel);
  const rawConfidence = rawOutput.confidence;
  const confidence =
    typeof rawConfidence === "number" && Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1
      ? Number(rawConfidence.toFixed(3))
      : null;

  const emotionalIndicators = Array.isArray(rawOutput.emotionalIndicators)
    ? rawOutput.emotionalIndicators
        .filter((item) => item && VALID_EMOTIONS.includes(String(item.emotion || "").toLowerCase()))
        .map((item) => ({
          emotion: String(item.emotion).toLowerCase(),
          evidence: String(item.evidence || "").slice(0, 200),
          tentative: true,
        }))
    : [];

  const depressionIndicators = Array.isArray(rawOutput.depressionIndicators)
    ? rawOutput.depressionIndicators
        .filter((item) => item && VALID_DEPRESSION_INDICATORS.includes(String(item.indicator || "").toLowerCase()))
        .map((item) => ({
          indicator: String(item.indicator).toLowerCase(),
          present: Boolean(item.present),
          evidence: String(item.evidence || "").slice(0, 200),
        }))
    : [];

  const followUpTopicsCovered = Array.isArray(rawOutput.followUpTopicsCovered)
    ? rawOutput.followUpTopicsCovered.map((t) => String(t).slice(0, 80)).filter(Boolean)
    : [];

  return {
    valid: Boolean(aiSuggestedLevel && typeof rawOutput.reply === "string" && rawOutput.reply.trim()),
    aiSuggestedLevel,
    emotionalIndicators,
    depressionIndicators,
    safetyConcern: Boolean(rawOutput.safetyConcern),
    safetyUncertainty: Boolean(rawOutput.safetyUncertainty),
    safetyReason: String(rawOutput.safetyReason || "").slice(0, 300),
    confidence,
    recommendPhq9: Boolean(rawOutput.recommendPhq9),
    detectedLanguage: ["en", "si", "mixed", "other"].includes(rawOutput.detectedLanguage)
      ? rawOutput.detectedLanguage
      : "en",
    followUpTopicsCovered,
  };
}

/**
 * Combines deterministic safety checks with validated Gemini structured indicators.
 * Gemini alone never makes final risk decisions.
 */
export function evaluateOperationalRisk({
  userMessage = "",
  aiStructuredOutput = null,
  phq9TotalScore = null,
  phq9Q9Score = null,
  previousRiskLevel = "low",
}) {
  const deterministic = detectCrisis(userMessage);
  const ai = validateAiScreeningOutput(aiStructuredOutput);

  const reasons = [];
  let validatedRiskLevel = ai.aiSuggestedLevel || "low";
  let deterministicOverride = false;
  let uncertaintyFlag = ai.safetyUncertainty || deterministic.uncertainSafety;
  let immediateSafetyConcern = false;

  // 1. Direct self-harm / suicide keyword or phrase detection overrides everything.
  if (deterministic.crisis) {
    validatedRiskLevel = "high";
    deterministicOverride = true;
    immediateSafetyConcern = true;
    reasons.push(
      `Deterministic safety rule matched self-harm/suicide indicator (${deterministic.matchedPattern || "pattern"}).`
    );
  }

  // 2. PHQ-9 Question 9 positive response (>0) triggers immediate safety workflow independently of total score.
  if (typeof phq9Q9Score === "number" && phq9Q9Score >= 1) {
    validatedRiskLevel = "high";
    deterministicOverride = true;
    immediateSafetyConcern = true;
    reasons.push(`PHQ-9 Question 9 reported thoughts of death or self-harm (score ${phq9Q9Score}/3).`);
  }

  // 3. AI flagged self_harm_or_death_thoughts or safetyConcern -> escalate to high.
  const aiSelfHarmIndicator = ai.depressionIndicators.some(
    (d) => d.indicator === "self_harm_or_death_thoughts" && d.present
  );
  if (ai.safetyConcern || aiSelfHarmIndicator) {
    if (validatedRiskLevel !== "high") {
      deterministicOverride = true;
    }
    validatedRiskLevel = "high";
    immediateSafetyConcern = true;
    reasons.push(ai.safetyReason || "AI structured screening flagged a potential safety concern.");
  }

  // 4. Uncertainty about immediate safety must NEVER default to low risk.
  if (deterministic.uncertainSafety) {
    validatedRiskLevel = "high";
    deterministicOverride = true;
    uncertaintyFlag = true;
    immediateSafetyConcern = true;
    reasons.push("Patient expressed uncertainty about staying safe; escalated for human attention.");
  } else if (ai.safetyUncertainty) {
    if (riskRank(validatedRiskLevel) < riskRank("moderate")) {
      validatedRiskLevel = "moderate";
      deterministicOverride = true;
    }
    uncertaintyFlag = true;
    reasons.push("AI flagged safety uncertainty requiring follow-up and human review.");
  }

  // 5. Low confidence or invalid structured AI output -> cannot stay low if distress is present.
  if (!ai.valid || (ai.confidence !== null && ai.confidence < LOW_CONFIDENCE_THRESHOLD)) {
    uncertaintyFlag = true;
    if (deterministic.moderateSignals.length > 0 && riskRank(validatedRiskLevel) < riskRank("moderate")) {
      validatedRiskLevel = "moderate";
      deterministicOverride = true;
      reasons.push("Low AI confidence alongside distress signals; escalated to moderate for human review.");
    } else if (!ai.valid && riskRank(validatedRiskLevel) < riskRank("moderate")) {
      validatedRiskLevel = "moderate";
      deterministicOverride = true;
      reasons.push("AI structured output could not be validated; escalated to moderate for review.");
    }
  }

  // 6. Multiple depression-related indicators or deterministic moderate distress signals -> moderate operational priority.
  const presentIndicators = ai.depressionIndicators.filter((d) => d.present);
  const hasHopelessness = ai.emotionalIndicators.some((e) => e.emotion === "hopelessness");
  if (presentIndicators.length >= 3 || (presentIndicators.length >= 2 && hasHopelessness)) {
    if (riskRank(validatedRiskLevel) < riskRank("moderate")) {
      validatedRiskLevel = "moderate";
      deterministicOverride = true;
    }
    reasons.push(
      `Multiple depression-related indicators noted (${presentIndicators.map((i) => i.indicator).join(", ")}).`
    );
  } else if (deterministic.moderateSignals.length >= 2 && riskRank(validatedRiskLevel) < riskRank("moderate")) {
    validatedRiskLevel = "moderate";
    deterministicOverride = true;
    reasons.push("Multiple persistent distress patterns detected in patient statement.");
  }

  // 7. PHQ-9 total score >= 10 warrants moderate operational follow-up (never auto-high without Q9/safety concern).
  if (typeof phq9TotalScore === "number" && phq9TotalScore >= 10) {
    if (riskRank(validatedRiskLevel) < riskRank("moderate")) {
      validatedRiskLevel = "moderate";
      deterministicOverride = true;
    }
    reasons.push(`PHQ-9 screening score (${phq9TotalScore}/27) warrants counsellor follow-up.`);
  }

  // Preserve elevated risk within an ongoing high-risk conversation unless reviewed.
  if (previousRiskLevel === "high" && validatedRiskLevel !== "high") {
    reasons.push("Conversation previously flagged high risk; retaining elevated monitoring until human review.");
  }

  if (reasons.length === 0) {
    reasons.push("Supportive interaction with no immediate safety concerns or multi-symptom escalation.");
  }

  return {
    aiSuggestedLevel: ai.aiSuggestedLevel,
    validatedRiskLevel,
    reasons,
    emotionalIndicators: ai.emotionalIndicators,
    depressionIndicators: ai.depressionIndicators,
    aiConfidence: ai.confidence,
    uncertaintyFlag,
    deterministicOverride,
    immediateSafetyConcern,
    requiresHumanAttention: validatedRiskLevel !== "low" || uncertaintyFlag,
    recommendPhq9: ai.recommendPhq9 || presentIndicators.length >= 2,
    detectedLanguage: deterministic.language !== "en" ? deterministic.language : ai.detectedLanguage,
    followUpTopicsCovered: ai.followUpTopicsCovered,
  };
}
