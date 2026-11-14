import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectCrisis, detectLanguageScript } from "../crisisDetector.js";
import {
  evaluateOperationalRisk,
  getConfiguredCrisisResources,
  validateAiScreeningOutput,
} from "../riskEngine.js";
import { parseGeminiJsonSafe } from "../geminiService.js";

describe("detectCrisis (English, Sinhala, Singlish & Safety Uncertainty)", () => {
  test("detects direct English self-harm disclosures", () => {
    assert.equal(detectCrisis("I want to kill myself tonight").crisis, true);
    assert.equal(detectCrisis("I've been cutting myself again").crisis, true);
  });

  test("detects Sinhala Unicode and Romanized Singlish self-harm disclosures", () => {
    const si = detectCrisis("මට මැරෙන්න ඕනේ");
    assert.equal(si.crisis, true);
    assert.equal(si.language, "si");

    const singlish = detectCrisis("mata marenna ona wage hithenawa");
    assert.equal(singlish.crisis, true);
    assert.equal(singlish.language, "mixed");
  });

  test("detects uncertain safety statements separately", () => {
    const res = detectCrisis("I am not sure I can keep myself safe tonight");
    assert.equal(res.uncertainSafety, true);
  });

  test("avoids false positives on benign phrases", () => {
    const res = detectCrisis("My diet changed during exams and I feel a bit tired");
    assert.equal(res.crisis, false);
    assert.equal(res.uncertainSafety, false);
  });

  test("identifies language scripts accurately", () => {
    assert.equal(detectLanguageScript("I feel sad today"), "en");
    assert.equal(detectLanguageScript("මට ගොඩක් දුකයි"), "si");
    assert.equal(detectLanguageScript("mama godak dukai today"), "mixed");
  });
});

describe("evaluateOperationalRisk (Backend Risk Validation Rules)", () => {
  test("classifies mild temporary distress as low risk when AI output is valid and safe", () => {
    const evaluation = evaluateOperationalRisk({
      userMessage: "I had a stressful quiz today but I'm talking with friends later.",
      aiStructuredOutput: {
        reply: "Exams can definitely feel stressful. Talking with friends sounds supportive.",
        detectedLanguage: "en",
        emotionalIndicators: [{ emotion: "stress", evidence: "stressful quiz" }],
        depressionIndicators: [],
        suggestedRiskLevel: "low",
        safetyConcern: false,
        safetyUncertainty: false,
        safetyReason: "",
        recommendPhq9: false,
        followUpTopicsCovered: ["recent stressor"],
        confidence: 0.9,
      },
    });

    assert.equal(evaluation.validatedRiskLevel, "low");
    assert.equal(evaluation.deterministicOverride, false);
    assert.equal(evaluation.immediateSafetyConcern, false);
  });

  test("classifies multiple depression indicators as moderate risk even if AI suggests low", () => {
    const evaluation = evaluateOperationalRisk({
      userMessage: "I've been sad, unable to sleep, and have no energy for weeks.",
      aiStructuredOutput: {
        reply: "Thank you for sharing how heavy things have felt.",
        detectedLanguage: "en",
        emotionalIndicators: [
          { emotion: "sadness", evidence: "sad for weeks" },
          { emotion: "hopelessness", evidence: "nothing helps" },
        ],
        depressionIndicators: [
          { indicator: "depressed_mood", present: true, evidence: "sad for weeks" },
          { indicator: "sleep_changes", present: true, evidence: "unable to sleep" },
          { indicator: "fatigue", present: true, evidence: "no energy" },
        ],
        suggestedRiskLevel: "low",
        safetyConcern: false,
        safetyUncertainty: false,
        safetyReason: "",
        recommendPhq9: true,
        followUpTopicsCovered: ["sleep", "duration"],
        confidence: 0.85,
      },
    });

    assert.equal(evaluation.validatedRiskLevel, "moderate");
    assert.equal(evaluation.deterministicOverride, true);
    assert.equal(evaluation.recommendPhq9, true);
  });

  test("overrides AI low-risk output to high risk on direct self-harm disclosure (false-negative protection)", () => {
    const evaluation = evaluateOperationalRisk({
      userMessage: "I don't want to live anymore, I want to end my life.",
      aiStructuredOutput: {
        reply: "Let's talk.",
        detectedLanguage: "en",
        emotionalIndicators: [],
        depressionIndicators: [],
        suggestedRiskLevel: "low",
        safetyConcern: false,
        safetyUncertainty: false,
        safetyReason: "",
        recommendPhq9: false,
        followUpTopicsCovered: [],
        confidence: 0.95,
      },
    });

    assert.equal(evaluation.validatedRiskLevel, "high");
    assert.equal(evaluation.deterministicOverride, true);
    assert.equal(evaluation.immediateSafetyConcern, true);
  });

  test("never classifies uncertain safety or malformed AI output as low risk", () => {
    const uncertain = evaluateOperationalRisk({
      userMessage: "I'm not sure I can keep myself safe tonight",
      aiStructuredOutput: null,
    });
    assert.equal(uncertain.validatedRiskLevel, "high");
    assert.equal(uncertain.uncertaintyFlag, true);

    const malformed = evaluateOperationalRisk({
      userMessage: "Everything feels dark",
      aiStructuredOutput: null,
    });
    assert.equal(malformed.validatedRiskLevel, "moderate");
    assert.equal(malformed.uncertaintyFlag, true);
  });

  test("treats PHQ-9 total score and Q9 immediate safety independently", () => {
    // High PHQ-9 total score (22) with Q9=0 -> moderate operational follow-up, NOT immediate suicide crisis
    const highTotalNoQ9 = evaluateOperationalRisk({
      phq9TotalScore: 22,
      phq9Q9Score: 0,
    });
    assert.equal(highTotalNoQ9.validatedRiskLevel, "moderate");
    assert.equal(highTotalNoQ9.immediateSafetyConcern, false);

    // Low PHQ-9 total score (3) with Q9=2 -> immediate HIGH safety escalation
    const lowTotalPositiveQ9 = evaluateOperationalRisk({
      phq9TotalScore: 3,
      phq9Q9Score: 2,
    });
    assert.equal(lowTotalPositiveQ9.validatedRiskLevel, "high");
    assert.equal(lowTotalPositiveQ9.immediateSafetyConcern, true);
  });

  test("voice and text transcripts receive identical risk validation", () => {
    const message = "I have no reason to live";
    const textEval = evaluateOperationalRisk({ userMessage: message });
    const voiceEval = evaluateOperationalRisk({ userMessage: message });
    assert.equal(textEval.validatedRiskLevel, "high");
    assert.equal(voiceEval.validatedRiskLevel, textEval.validatedRiskLevel);
    assert.equal(voiceEval.immediateSafetyConcern, textEval.immediateSafetyConcern);
  });

  test("crisis resources disclaimer never claims emergency services were contacted automatically", () => {
    const resources = getConfiguredCrisisResources();
    assert.match(resources.disclaimer, /cannot automatically contact emergency services/i);
    assert.ok(resources.contacts.length >= 3);
  });
});

describe("Structured AI JSON parsing & validation", () => {
  test("parses fenced JSON safely and rejects malformed strings gracefully", () => {
    const parsed = parseGeminiJsonSafe('```json\n{"reply":"Hello"}\n```');
    assert.deepEqual(parsed, { reply: "Hello" });
    assert.equal(parseGeminiJsonSafe("not json at all"), null);
  });

  test("filters out unknown emotion or indicator values", () => {
    const validated = validateAiScreeningOutput({
      reply: "I hear you.",
      suggestedRiskLevel: "low",
      emotionalIndicators: [
        { emotion: "sadness", evidence: "crying" },
        { emotion: "made_up_diagnosis", evidence: "x" },
      ],
      depressionIndicators: [
        { indicator: "fatigue", present: true, evidence: "tired" },
        { indicator: "invalid_key", present: true, evidence: "y" },
      ],
      confidence: 0.8,
    });

    assert.equal(validated.valid, true);
    assert.equal(validated.emotionalIndicators.length, 1);
    assert.equal(validated.depressionIndicators.length, 1);
  });
});
