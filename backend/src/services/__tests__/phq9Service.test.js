import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PHQ9_QUESTIONS,
  PHQ9_RESPONSE_OPTIONS,
  Phq9ValidationError,
  calculatePhq9Summary,
  interpretPhq9Score,
  validatePhq9Answer,
} from "../phq9Service.js";

describe("PHQ-9 Screening Validation & Backend Scoring", () => {
  test("provides all 9 validated questions and 4 response options", () => {
    assert.equal(PHQ9_QUESTIONS.length, 9);
    assert.equal(PHQ9_RESPONSE_OPTIONS.length, 4);
    assert.equal(PHQ9_QUESTIONS[8].key, "self_harm_thoughts");
  });

  test("enforces sequential ordering and valid answer range (0..3)", () => {
    const valid = validatePhq9Answer({
      questionNumber: 1,
      responseValue: 2,
      expectedQuestionNumber: 1,
    });
    assert.equal(valid.responseLabel, "More than half the days");
    assert.equal(valid.isQuestion9Positive, false);

    assert.throws(
      () =>
        validatePhq9Answer({
          questionNumber: 3,
          responseValue: 1,
          expectedQuestionNumber: 2,
        }),
      Phq9ValidationError
    );

    assert.throws(
      () =>
        validatePhq9Answer({
          questionNumber: 1,
          responseValue: 4,
          expectedQuestionNumber: 1,
        }),
      Phq9ValidationError
    );

    assert.throws(
      () =>
        validatePhq9Answer({
          questionNumber: 1,
          responseValue: -1,
          expectedQuestionNumber: 1,
        }),
      Phq9ValidationError
    );
  });

  test("flags Question 9 positive response for separate safety workflow", () => {
    const q9 = validatePhq9Answer({
      questionNumber: 9,
      responseValue: 1,
      expectedQuestionNumber: 9,
    });
    assert.equal(q9.isQuestion9Positive, true);
  });

  test("computes minimum score (0 -> Minimal) and maximum score (27 -> Severe)", () => {
    const minResponses = Array.from({ length: 9 }, (_, i) => ({
      questionNumber: i + 1,
      responseValue: 0,
    }));
    const minSummary = calculatePhq9Summary(minResponses);
    assert.equal(minSummary.totalScore, 0);
    assert.equal(minSummary.severityBand, "Minimal");
    assert.equal(minSummary.q9SafetyTriggered, false);

    const maxResponses = Array.from({ length: 9 }, (_, i) => ({
      questionNumber: i + 1,
      responseValue: 3,
    }));
    const maxSummary = calculatePhq9Summary(maxResponses);
    assert.equal(maxSummary.totalScore, 27);
    assert.equal(maxSummary.severityBand, "Severe");
    assert.equal(maxSummary.q9SafetyTriggered, true);
  });

  test("interprets all standard PHQ-9 severity thresholds accurately", () => {
    assert.equal(interpretPhq9Score(4), "Minimal");
    assert.equal(interpretPhq9Score(5), "Mild");
    assert.equal(interpretPhq9Score(9), "Mild");
    assert.equal(interpretPhq9Score(10), "Moderate");
    assert.equal(interpretPhq9Score(14), "Moderate");
    assert.equal(interpretPhq9Score(15), "Moderately severe");
    assert.equal(interpretPhq9Score(19), "Moderately severe");
    assert.equal(interpretPhq9Score(20), "Severe");
  });

  test("rejects incomplete PHQ-9 submissions", () => {
    assert.throws(
      () =>
        calculatePhq9Summary([
          { questionNumber: 1, responseValue: 1 },
          { questionNumber: 2, responseValue: 1 },
        ]),
      Phq9ValidationError
    );
  });
});
