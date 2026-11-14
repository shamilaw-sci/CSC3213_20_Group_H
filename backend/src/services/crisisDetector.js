// Deterministic self-harm / suicide risk detector.
// Runs before any LLM call so crisis handling never depends on model behavior.
const CRISIS_PATTERNS = [
  /\bkill(ing)?\s+my\s?self\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)?\s+(my|it\s+all|this)\s*(life)?\b/i,
  /\bwant(ed)?\s+to\s+die\b/i,
  /\bwish(ed)?\s+i\s+(was|were)\s+dead\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\b(hurt|harm)\s+my\s?self\b/i,
  /\bself[\s-]?harm\b/i,
  /\bcut(ting)?\s+my\s?self\b/i,
  /\bover ?dose\b/i,
  /\bcan'?t\s+go\s+on\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\bplan(ning)?\s+to\s+(die|kill)\b/i,
  /\bgoodbye\s+forever\b/i,
  /\bending\s+it\b/i,
];

export function detectCrisis(text) {
  if (!text || typeof text !== "string") {
    return { crisis: false };
  }

  const match = CRISIS_PATTERNS.find((pattern) => pattern.test(text));

  return {
    crisis: Boolean(match),
    matchedPattern: match ? match.source : undefined,
  };
}
