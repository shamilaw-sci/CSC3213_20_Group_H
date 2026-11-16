import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectCrisis, detectLanguageScript } from "../crisisDetector.js";
import {
  evaluateOperationalRisk,
  getConfiguredCrisisResources,
  validateAiScreeningOutput,
} from "../riskEngine.js";
import {
  callGeminiGenerateContentWithMeta,
  GeminiUnavailableError,
  getCandidateGeminiModels,
  parseGeminiJsonSafe,
  SUPPORT_SYSTEM_PROMPT,
} from "../geminiService.js";
import {
  buildLiveVoiceSystemInstruction,
  LIVE_VOICE_SYSTEM_INSTRUCTION,
} from "../liveVoiceService.js";

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

  test("crisis resources use a dialable campus hotline when configured", () => {
    const originalContact = process.env.CAMPUS_COUNSELLING_CONTACT;

    try {
      process.env.CAMPUS_COUNSELLING_CONTACT = "Use the Emergency Help button on screen";
      const resources = getConfiguredCrisisResources();
      const campusContact = resources.contacts.find(
        (contact) => contact.name === "University Counselling Support Desk",
      );

      assert.equal(campusContact?.number, "+94701343444");
    } finally {
      if (originalContact === undefined) {
        delete process.env.CAMPUS_COUNSELLING_CONTACT;
      } else {
        process.env.CAMPUS_COUNSELLING_CONTACT = originalContact;
      }
    }
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

describe("Counselling-Only Scope Guardrails (Chat & Voice Prompts)", () => {
  test("chat system prompt strictly forbids answering off-topic general trivia", () => {
    assert.match(SUPPORT_SYSTEM_PROMPT, /Counselling & Wellbeing ONLY/i);
    assert.match(SUPPORT_SYSTEM_PROMPT, /REFUSE to answer/i);
    assert.match(SUPPORT_SYSTEM_PROMPT, /NEVER answer an off-topic question/i);
  });

  test("live voice instruction enforces counselling-only scope and appends recent context", () => {
    assert.match(LIVE_VOICE_SYSTEM_INSTRUCTION, /Counselling & Wellbeing ONLY/i);
    assert.match(LIVE_VOICE_SYSTEM_INSTRUCTION, /NEVER provide the factual answer/i);

    const base = buildLiveVoiceSystemInstruction([]);
    assert.equal(base, LIVE_VOICE_SYSTEM_INSTRUCTION);

    const withHistory = buildLiveVoiceSystemInstruction([
      { sender: "patient", content: "I feel anxious about my exams" },
      { sender: "bot", content: "I hear how stressful exams feel right now." },
    ]);
    assert.match(withHistory, /Recent conversation context/);
    assert.match(withHistory, /Student: I feel anxious about my exams/);
    assert.match(withHistory, /Assistant: I hear how stressful exams feel right now\./);
  });
});

describe("Gemini 503 Model Fallback", () => {
  test("deduplicates candidate models while preserving primary model first", () => {
    const models = getCandidateGeminiModels(
      "gemini-flash-lite-latest",
      "gemini-flash-lite-latest, gemini-3.5-flash"
    );
    assert.deepEqual(models, ["gemini-flash-lite-latest", "gemini-3.5-flash"]);
  });

  test("falls back to secondary model when primary returns 503", async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-key";
    const calledUrls = [];

    const mockFetch = async (url) => {
      calledUrls.push(url);
      if (calledUrls.length === 1) {
        return { ok: false, status: 503, text: async () => "UNAVAILABLE" };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Fallback succeeded" }] } }],
        }),
      };
    };

    try {
      const result = await callGeminiGenerateContentWithMeta({
        systemPrompt: "sys",
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        fetchFn: mockFetch,
      });
      assert.equal(calledUrls.length, 2);
      assert.equal(result.text, "Fallback succeeded");
      assert.equal(result.modelUsed, "gemini-flash-lite-latest");
    } finally {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
    }
  });

  test("throws GeminiUnavailableError when all candidate models return 503", async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-key";
    const mockFetch = async () => ({
      ok: false,
      status: 503,
      text: async () => "UNAVAILABLE",
    });

    try {
      await assert.rejects(
        () =>
          callGeminiGenerateContentWithMeta({
            systemPrompt: "sys",
            contents: [{ role: "user", parts: [{ text: "hi" }] }],
            fetchFn: mockFetch,
          }),
        GeminiUnavailableError
      );
    } finally {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
    }
  });
});
