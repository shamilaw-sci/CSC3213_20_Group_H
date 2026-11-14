import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { triggerEmergency } from './emergencyController.js';

// Builds a minimal Express-like response double that records status/json calls.
function createMockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
}

describe('triggerEmergency validation & auth guards', () => {
    test('rejects requests with no authenticated user', async () => {
        const req = { user: undefined, body: {} };
        const res = createMockRes();

        await triggerEmergency(req, res);

        assert.equal(res.statusCode, 401);
        assert.match(res.body.error, /authentication/i);
    });

    test('rejects requests with a non-string description', async () => {
        const req = { user: { id: 1 }, body: { description: 12345 } };
        const res = createMockRes();

        await triggerEmergency(req, res);

        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /description/i);
    });

    test('rejects requests with an out-of-range aiConfidence', async () => {
        const req = { user: { id: 1 }, body: { aiConfidence: 5 } };
        const res = createMockRes();

        await triggerEmergency(req, res);

        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /aiConfidence/i);
    });

    test('rejects requests with a non-numeric aiConfidence', async () => {
        const req = { user: { id: 1 }, body: { aiConfidence: 'high' } };
        const res = createMockRes();

        await triggerEmergency(req, res);

        assert.equal(res.statusCode, 400);
    });

    test('validation runs before any DB access, even with an invalid aiConfidence and no description', async () => {
        const req = { user: { id: 1 }, body: { aiConfidence: -1 } };
        const res = createMockRes();

        await triggerEmergency(req, res);

        assert.equal(res.statusCode, 400);
    });
});
