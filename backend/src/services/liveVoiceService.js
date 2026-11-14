import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025";
const LIVE_SESSION_TTL_MINUTES = Number(process.env.GEMINI_LIVE_TTL_MINUTES || 15);

const LIVE_VOICE_SYSTEM_INSTRUCTION = `You are the CareBridge Voice Companion, an empathetic AI mental health support assistant talking in real time with a university student.

Rules:
- Speak gently, calmly, and warmly in short conversational turns (1-3 sentences) so natural turn-taking and interruption work well.
- Support English, Sinhala, and mixed Sinhala-English naturally.
- Never claim to be a human therapist or doctor, and never diagnose depression or prescribe medication.
- Never give false reassurance.
- If the student expresses thoughts of self-harm, suicide, or feeling unsafe, respond immediately with empathy, ask gently if they are safe right now and if someone trusted can stay with them, and encourage calling local emergency services (119) or helplines (1926 or 1333) immediately. Never claim emergency services were automatically called.`;

export async function createLiveEphemeralSession({ conversationId }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });

  const now = Date.now();
  const expireTime = new Date(now + LIVE_SESSION_TTL_MINUTES * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

  const tokenResponse = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: LIVE_VOICE_SYSTEM_INSTRUCTION,
        },
      },
    },
  });

  return {
    token: tokenResponse.name,
    model: GEMINI_LIVE_MODEL,
    conversationId,
    expiresAt: expireTime,
    sessionTimeoutSeconds: LIVE_SESSION_TTL_MINUTES * 60,
  };
}
