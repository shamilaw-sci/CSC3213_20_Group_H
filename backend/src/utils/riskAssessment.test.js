import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    assessSeverity,
    detectRiskKeywords,
    normalizeAiConfidence,
    normalizeDescription,
    ValidationError,
    CONFIDENCE_ESCALATION_THRESHOLD,
    MAX_DESCRIPTION_LENGTH,
} from './riskAssessment.js';

describe('normalizeDescription', () => {
    test('returns an empty string for missing description', () => {
        assert.equal(normalizeDescription(undefined), '');
        assert.equal(normalizeDescription(null), '');
    });

    test('trims whitespace', () => {
        assert.equal(normalizeDescription('  help me  '), 'help me');
    });

    test('rejects non-string input', () => {
        assert.throws(() => normalizeDescription(12345), ValidationError);
        assert.throws(() => normalizeDescription({ foo: 'bar' }), ValidationError);
    });

    test('rejects descriptions longer than the max length', () => {
        const tooLong = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
        assert.throws(() => normalizeDescription(tooLong), ValidationError);
    });

    test('accepts a description exactly at the max length', () => {
        const atLimit = 'a'.repeat(MAX_DESCRIPTION_LENGTH);
        assert.equal(normalizeDescription(atLimit), atLimit);
    });
});

describe('normalizeAiConfidence', () => {
    test('returns null when omitted', () => {
        assert.equal(normalizeAiConfidence(undefined), null);
        assert.equal(normalizeAiConfidence(null), null);
    });

    test('accepts values within [0, 1]', () => {
        assert.equal(normalizeAiConfidence(0), 0);
        assert.equal(normalizeAiConfidence(1), 1);
        assert.equal(normalizeAiConfidence(0.5), 0.5);
    });

    test('rejects out-of-range values', () => {
        assert.throws(() => normalizeAiConfidence(-0.1), ValidationError);
        assert.throws(() => normalizeAiConfidence(1.1), ValidationError);
    });

    test('rejects non-numeric or non-finite values', () => {
        assert.throws(() => normalizeAiConfidence('0.5'), ValidationError);
        assert.throws(() => normalizeAiConfidence(NaN), ValidationError);
        assert.throws(() => normalizeAiConfidence(Infinity), ValidationError);
    });
});

describe('detectRiskKeywords', () => {
    test('finds a known crisis phrase regardless of case', () => {
        assert.deepEqual(detectRiskKeywords('I want to KILL MYSELF right now'), ['kill myself']);
    });

    test('returns no matches for benign text', () => {
        assert.deepEqual(detectRiskKeywords('I am just feeling a bit stressed about exams'), []);
    });

    test('does not flag unrelated words that merely contain risk substrings', () => {
        // "die" alone isn't a tracked keyword, so "died"/"diet" style text should not match.
        assert.deepEqual(detectRiskKeywords('My diet has been all over the place lately'), []);
    });

    test('can find multiple distinct matches', () => {
        const matches = detectRiskKeywords('thinking about suicide and self-harm');
        assert.ok(matches.includes('suicide'));
        assert.ok(matches.includes('self-harm'));
    });
});

describe('assessSeverity', () => {
    test('defaults to High severity with no confidence or risk keywords', () => {
        const result = assessSeverity({ description: 'Feeling overwhelmed with coursework' });
        assert.equal(result.severityScore, 'High');
        assert.equal(result.fallbackTriggered, false);
        assert.equal(result.keywordRiskDetected, false);
        assert.deepEqual(result.matchedKeywords, []);
    });

    test('escalates to Critical when aiConfidence is below the threshold', () => {
        const result = assessSeverity({ description: 'panic button', aiConfidence: 0.4 });
        assert.equal(result.severityScore, 'Critical');
        assert.equal(result.fallbackTriggered, true);
    });

    test('does not escalate when aiConfidence is at or above the threshold', () => {
        const result = assessSeverity({ description: 'panic button', aiConfidence: CONFIDENCE_ESCALATION_THRESHOLD });
        assert.equal(result.severityScore, 'High');
        assert.equal(result.fallbackTriggered, false);
    });

    test('escalates to Critical when the description contains a risk keyword, even with high confidence', () => {
        const result = assessSeverity({ description: 'I want to end my life', aiConfidence: 0.99 });
        assert.equal(result.severityScore, 'Critical');
        assert.equal(result.keywordRiskDetected, true);
        assert.ok(result.matchedKeywords.includes('end my life'));
    });

    test('handles a request with neither description nor aiConfidence', () => {
        const result = assessSeverity({});
        assert.equal(result.severityScore, 'High');
        assert.equal(result.aiConfidence, null);
        assert.equal(result.description, '');
    });

    test('propagates validation errors for malformed input', () => {
        assert.throws(() => assessSeverity({ description: 42 }), ValidationError);
        assert.throws(() => assessSeverity({ aiConfidence: 2 }), ValidationError);
    });
});
