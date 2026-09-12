// Severity calculation & crisis-keyword risk detection for the emergency escalation flow.

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Phrases (not single words) to keep false-positive matches low, e.g. "die" alone
// would also match "died"/"diet" in unrelated contexts.
export const CRITICAL_RISK_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'ending my life',
  'want to die',
  'no reason to live',
  'self-harm',
  'self harm',
  'hurt myself',
  'hurting myself',
  'overdose',
  'cutting myself',
];

const MIN_CONFIDENCE = 0;
const MAX_CONFIDENCE = 1;
export const CONFIDENCE_ESCALATION_THRESHOLD = 0.65;
export const MAX_DESCRIPTION_LENGTH = 2000;

export function normalizeDescription(description) {
  if (description === undefined || description === null) {
    return '';
  }
  if (typeof description !== 'string') {
    throw new ValidationError('description must be a string');
  }
  const trimmed = description.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
  }
  return trimmed;
}

export function normalizeAiConfidence(aiConfidence) {
  if (aiConfidence === undefined || aiConfidence === null) {
    return null;
  }
  if (typeof aiConfidence !== 'number' || !Number.isFinite(aiConfidence)) {
    throw new ValidationError('aiConfidence must be a finite number');
  }
  if (aiConfidence < MIN_CONFIDENCE || aiConfidence > MAX_CONFIDENCE) {
    throw new ValidationError(`aiConfidence must be between ${MIN_CONFIDENCE} and ${MAX_CONFIDENCE}`);
  }
  return aiConfidence;
}

export function detectRiskKeywords(description) {
  const text = description.toLowerCase();
  return CRITICAL_RISK_KEYWORDS.filter((keyword) => text.includes(keyword));
}

// Pure function: given a raw request body, returns the severity decision.
// Throws ValidationError for malformed input so callers can map it to a 400 response.
export function assessSeverity({ description, aiConfidence } = {}) {
  const normalizedDescription = normalizeDescription(description);
  const normalizedConfidence = normalizeAiConfidence(aiConfidence);

  const matchedKeywords = detectRiskKeywords(normalizedDescription);
  const keywordRiskDetected = matchedKeywords.length > 0;
  const lowConfidence =
    normalizedConfidence !== null && normalizedConfidence < CONFIDENCE_ESCALATION_THRESHOLD;

  const fallbackTriggered = keywordRiskDetected || lowConfidence;
  const severityScore = fallbackTriggered ? 'Critical' : 'High';

  return {
    severityScore,
    fallbackTriggered,
    keywordRiskDetected,
    matchedKeywords,
    aiConfidence: normalizedConfidence,
    description: normalizedDescription,
  };
}
