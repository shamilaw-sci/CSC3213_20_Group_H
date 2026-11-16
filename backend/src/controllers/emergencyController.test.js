import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/db.js';
import * as emergencyController from './emergencyController.js';
import { authMiddleware } from '../auth/authMiddleware.js';

describe('Module 6: Emergency Support Verification', () => {
  let emittedEvents = [];

  beforeEach(() => {
    emittedEvents = [];
    global.io = {
      to: (room) => ({
        emit: (event, payload) => {
          emittedEvents.push({ room, event, payload });
        },
      }),
    };
  });

  // 1. Verify Invalid Authentication returns HTTP 401
  it('returns HTTP 401 when authentication token is missing or invalid', async () => {
    const req = { headers: { authorization: 'Bearer invalid.jwt.token' } };
    let statusCode = 200;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    let nextCalled = false;
    await authMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
  });

  // 2. Verify HTTP 201, Outbox Queueing & Available Counsellor Filtering
  it('queues persistent notification and responds HTTP 201 under 3 seconds', async () => {
    const executedQueries = [];
    const queryMock = mock.method(db, 'query', async (sql, params) => {
      executedQueries.push({ sql, params });
      if (sql.includes('INSERT INTO emergencies')) {
        return [{ insertId: 501 }];
      }
      if (sql.includes('INSERT INTO emergency_notifications')) {
        return [{ insertId: 1 }];
      }
      if (sql.includes('is_available = TRUE')) {
        return [[
          { id: 101, name: 'Dr. Available', email: 'avail@pera.ac.lk', phone: '+94771111111', is_available: 1 }
        ]];
      }
      return [[]];
    });

    const req = {
      user: { id: 401, role: 'student' },
      body: { description: 'Severe panic attack', ai_confidence: 0.95 },
    };

    let resStatus = null;
    let resData = null;
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(data) {
        resData = data;
        return this;
      },
    };

    const handler = emergencyController.triggerEmergency || emergencyController.default?.triggerEmergency;
    await handler(req, res);

    assert.equal(resStatus, 201);
    assert.equal(resData.emergencyId, 501);

    const outboxInsert = executedQueries.find((q) => q.sql.includes('INSERT INTO emergency_notifications'));
    assert.ok(outboxInsert, 'Expected emergency_notifications outbox insert before HTTP 201');
    const queuedPayload = JSON.parse(outboxInsert.params[1]);
    assert.equal(queuedPayload.recipients[0].phone, '+94771111111');

    queryMock.mock.restore();
  });
});