// Deterministic self-harm, suicide, and safety-uncertainty detector.
// Runs independently of any LLM output so crisis handling never relies solely on AI behavior.

const ENGLISH_CRISIS_PATTERNS = [
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
  /\btook\s+(too\s+many\s+pills|a\s+bottle\s+of\s+pills)\b/i,
  /\bjump(ing)?\s+off\b/i,
];

// Sinhala Unicode & Romanized Sinhala (Singlish) self-harm / suicide patterns.
const SINHALA_CRISIS_PATTERNS = [
  /මැරෙන්න\s*(ඕන|හිතෙනවා|යනවා|ඕනේ)/,
  /මට\s*මැරෙන්න/,
  /මම\s*මැරෙනවා/,
  /සියදිවි\s*නසා/,
  /දිවි\s*නසා/,
  /ජීවිතේ\s*නැති\s*(කර|කරගන්න)/,
  /ජීවිතය\s*නැති\s*(කර|කරගන්න)/,
  /ආත්මහත්‍යා/,
  /ජීවත්\s*වෙන්න\s*(බෑ|බැහැ|ඕන\s*නෑ)/,
  /මාවම\s*තුවාල/,
  /\bmarenna\s+(ona|one|hithenawa|yanawa)\b/i,
  /\bmata\s+marenna\b/i,
  /\bmama\s+marenawa\b/i,
  /\bsiyadiwi\b/i,
  /\bdiwi\s*nasa\b/i,
  /\bjeewithe\s+nathi\b/i,
  /\bjeewath\s+wenna\s+(ba|baa|baha|one\s+na)\b/i,
  /\bmage\s+jeewithe\s+iwara\b/i,
];

// Expressions where immediate safety is uncertain or ambiguous and must NOT be classified as low risk.
const UNCERTAIN_SAFETY_PATTERNS = [
  /\bnot\s+sure\s+(if\s+)?i\s+can\s+(stay|keep\s+myself)\s+safe\b/i,
  /\bdon'?t\s+know\s+(if\s+)?i\s+can\s+(stay|keep\s+myself)\s+safe\b/i,
  /\bmight\s+(hurt|harm)\s+myself\b/i,
  /\bafraid\s+i\s+(might|will)\s+(hurt|harm)\s+myself\b/i,
  /\bunsafe\s+(with\s+myself|right\s+now|tonight)\b/i,
  /\bthinking\s+about\s+not\s+being\s+here\b/i,
  /\bmaybe\s+i\s+shouldn'?t\s+be\s+here\b/i,
  /\bcan'?t\s+promise\s+(i'?ll\s+be|to\s+stay)\s+safe\b/i,
  /මට\s*ආරක්ෂිත.*(නෑ|දන්නේ\s*නෑ)/,
  /මාව\s*පාලනය\s*කරගන්න\s*බෑ/,
  /\bmata\s+arakshitha\b/i,
  /\bcontrol\s+karaganna\s+ba\b/i,
];

const MODERATE_DISTRESS_PATTERNS = [
  /\bhopeless(ness)?\b/i,
  /\bworthless(ness)?\b/i,
  /\bno\s+energy\b/i,
  /\bcan'?t\s+(sleep|eat|concentrate|focus)\b/i,
  /\blost\s+interest\b/i,
  /\bnothing\s+(matters|makes\s+me\s+happy)\b/i,
  /\bevery\s+day\s+(sad|crying|empty)\b/i,
  /\bfor\s+(weeks|months)\b/i,
  /බලාපොරොත්තුවක්\s*නෑ/,
  /නින්ද\s*යන්නේ\s*නෑ/,
  /කිසිම\s*ආසාවක්\s*නෑ/,
  /ගොඩක්\s*දුකයි/,
  /\bninda\s+yanne\s+na\b/i,
  /\bbalaporoththuwak\s+na\b/i,
  /\bgodak\s+dukai\b/i,
];

export function detectLanguageScript(text) {
  if (!text || typeof text !== "string") return "en";
  const hasSinhalaUnicode = /[\u0D80-\u0DFF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasSinhalaUnicode && hasLatin) return "mixed";
  if (hasSinhalaUnicode) return "si";

  const singlishMarkers = /\b(mama|mata|mage|oya|oyata|godak|ninda|dukai|hithenawa|marenna|jeewithe|jeewath|kohomada|amarui)\b/i;
  if (singlishMarkers.test(text)) return "mixed";
  return "en";
}

export function detectCrisis(text) {
  if (!text || typeof text !== "string") {
    return {
      crisis: false,
      uncertainSafety: false,
      moderateSignals: [],
      language: "en",
    };
  }

  const language = detectLanguageScript(text);
  const enMatch = ENGLISH_CRISIS_PATTERNS.find((pattern) => pattern.test(text));
  const siMatch = SINHALA_CRISIS_PATTERNS.find((pattern) => pattern.test(text));
  const uncertainMatch = UNCERTAIN_SAFETY_PATTERNS.find((pattern) => pattern.test(text));
  const moderateSignals = MODERATE_DISTRESS_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);

  const matched = enMatch || siMatch;

  return {
    crisis: Boolean(matched),
    uncertainSafety: Boolean(uncertainMatch),
    matchedPattern: matched ? matched.source : uncertainMatch ? uncertainMatch.source : undefined,
    moderateSignals,
    language,
  };
}
