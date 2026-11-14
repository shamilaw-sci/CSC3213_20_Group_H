export const PHQ9_QUESTIONS = [
  {
    number: 1,
    key: "anhedonia",
    text: "Little interest or pleasure in doing things",
    si: "දේවල් කිරීමට ඇති ආසාව හෝ සතුට අඩුවීම",
  },
  {
    number: 2,
    key: "depressed_mood",
    text: "Feeling down, depressed, or hopeless",
    si: "දුකෙන්, කලකිරීමෙන් හෝ බලාපොරොත්තු රහිතව සිටීම",
  },
  {
    number: 3,
    key: "sleep_changes",
    text: "Trouble falling or staying asleep, or sleeping too much",
    si: "නින්ද යාමට හෝ නින්දේ රැඳී සිටීමට අපහසුවීම, හෝ ඕනෑවට වඩා නිදාගැනීම",
  },
  {
    number: 4,
    key: "fatigue",
    text: "Feeling tired or having little energy",
    si: "වෙහෙසක් දැනීම හෝ ශක්තිය අඩුවීම",
  },
  {
    number: 5,
    key: "appetite_changes",
    text: "Poor appetite or overeating",
    si: "ආහාර රුචිය අඩුවීම හෝ ඕනෑවට වඩා ආහාර ගැනීම",
  },
  {
    number: 6,
    key: "worthlessness_guilt",
    text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    si: "තමන් ගැන නරක හැඟීමක් ඇතිවීම — හෝ තමන් අසාර්ථක යැයි හෝ පවුල අසරණ කළා යැයි දැනීම",
  },
  {
    number: 7,
    key: "concentration_difficulty",
    text: "Trouble concentrating on things, such as reading or watching television",
    si: "පොත් කියවීම හෝ රූපවාහිනිය නැරඹීම වැනි දේ කෙරෙහි අවධානය යොමු කිරීමට අපහසුවීම",
  },
  {
    number: 8,
    key: "psychomotor_changes",
    text: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
    si: "අන් අයට පෙනෙන තරමට සෙමින් චලනය වීම හෝ කතා කිරීම, හෝ ඊට ප්‍රතිවිරුද්ධව නොසන්සුන්ව එහා මෙහා යාම",
  },
  {
    number: 9,
    key: "self_harm_thoughts",
    text: "Thoughts that you would be better off dead, or of hurting yourself in some way",
    si: "මිය යාම වඩා හොඳ යැයි හෝ කිසියම් ආකාරයකින් තමන්ටම හානි කර ගැනීමට සිතුවිලි ඇතිවීම",
  },
];

export const PHQ9_RESPONSE_OPTIONS = [
  { value: 0, label: "Not at all", si: "කොහෙත්ම නැත" },
  { value: 1, label: "Several days", si: "දින කිහිපයක්" },
  { value: 2, label: "More than half the days", si: "දින භාගයකට වඩා" },
  { value: 3, label: "Nearly every day", si: "සෑම දිනකම පාහේ" },
];

export class Phq9ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "Phq9ValidationError";
  }
}

export function interpretPhq9Score(totalScore) {
  if (!Number.isInteger(totalScore) || totalScore < 0 || totalScore > 27) {
    throw new Phq9ValidationError("PHQ-9 total score must be an integer between 0 and 27.");
  }
  if (totalScore <= 4) return "Minimal";
  if (totalScore <= 9) return "Mild";
  if (totalScore <= 14) return "Moderate";
  if (totalScore <= 19) return "Moderately severe";
  return "Severe";
}

export function validatePhq9Answer({ questionNumber, responseValue, expectedQuestionNumber }) {
  if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > 9) {
    throw new Phq9ValidationError("questionNumber must be an integer between 1 and 9.");
  }
  if (expectedQuestionNumber && questionNumber !== expectedQuestionNumber) {
    throw new Phq9ValidationError(
      `PHQ-9 questions must be answered in order. Expected question ${expectedQuestionNumber}, received ${questionNumber}.`
    );
  }
  if (!Number.isInteger(responseValue) || responseValue < 0 || responseValue > 3) {
    throw new Phq9ValidationError("responseValue must be an integer between 0 and 3.");
  }

  const question = PHQ9_QUESTIONS[questionNumber - 1];
  const option = PHQ9_RESPONSE_OPTIONS[responseValue];

  return {
    questionNumber,
    questionText: question.text,
    responseValue,
    responseLabel: option.label,
    isQuestion9Positive: questionNumber === 9 && responseValue >= 1,
  };
}

export function calculatePhq9Summary(responses) {
  if (!Array.isArray(responses) || responses.length !== 9) {
    throw new Phq9ValidationError("All 9 PHQ-9 responses are required to calculate the total score.");
  }

  const byQuestion = new Map();
  for (const r of responses) {
    const qNum = r.questionNumber ?? r.question_number;
    const val = r.responseValue ?? r.response_value;
    if (!Number.isInteger(qNum) || qNum < 1 || qNum > 9) {
      throw new Phq9ValidationError(`Invalid PHQ-9 question number: ${qNum}`);
    }
    if (!Number.isInteger(val) || val < 0 || val > 3) {
      throw new Phq9ValidationError(`Invalid PHQ-9 response value for Q${qNum}: ${val}`);
    }
    byQuestion.set(qNum, val);
  }

  if (byQuestion.size !== 9) {
    throw new Phq9ValidationError("PHQ-9 must contain one response for each question 1 through 9.");
  }

  let totalScore = 0;
  for (let q = 1; q <= 9; q += 1) {
    totalScore += byQuestion.get(q);
  }

  const q9Score = byQuestion.get(9);
  const severityBand = interpretPhq9Score(totalScore);

  return {
    totalScore,
    severityBand,
    q9Score,
    q9SafetyTriggered: q9Score >= 1,
    disclaimer:
      "PHQ-9 results provide structured screening information and do not constitute a clinical diagnosis.",
  };
}
