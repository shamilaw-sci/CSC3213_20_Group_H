import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { SECRET } from "../config.js";
import counsellorRoutes from "../routes/counsellorRoutes.js";
import { triggerEmergency } from "./emergencyController.js";
import "../services/notificationWorker.js";

describe("Counsellor emergency availability", () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/counsellors", counsellorRoutes);
    server = await new Promise((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/counsellors/me/emergency-availability`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await db.end();
  });

  const tokenFor = (role) => jwt.sign({ id: 17, role }, SECRET);
  const request = (method, token, body) => fetch(baseUrl, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  it("requires authentication and the counsellor role", async () => {
    const query = mock.method(db, "query", () => {
      throw new Error("Unauthorized requests must not access the database.");
    });
    try {
      assert.equal((await request("GET")).status, 401);
      assert.equal((await request("PUT", tokenFor("student"), { isAvailable: true })).status, 403);
      assert.equal(query.mock.callCount(), 0);
    } finally {
      query.mock.restore();
    }
  });

  it("reads and updates only the authenticated counsellor's availability", async () => {
    const query = mock.method(db, "query", async (sql, params) => {
      if (sql.startsWith("SELECT")) {
        assert.deepEqual(params, [17]);
        return [[{ is_available: 0 }]];
      }
      assert.deepEqual(params, [true, 17]);
      return [{ affectedRows: 1 }];
    });
    try {
      const get = await request("GET", tokenFor("counsellor"));
      assert.equal(get.status, 200);
      assert.deepEqual(await get.json(), { isAvailable: false });

      const put = await request("PUT", tokenFor("counsellor"), { isAvailable: true, userId: 99 });
      assert.equal(put.status, 200);
      assert.deepEqual(await put.json(), { isAvailable: true });
    } finally {
      query.mock.restore();
    }
  });

  it("rejects invalid values and reports missing profiles", async () => {
    const query = mock.method(db, "query", async (sql) => (
      sql.startsWith("SELECT") ? [[]] : [{ affectedRows: 0 }]
    ));
    try {
      assert.equal((await request("PUT", tokenFor("counsellor"), { isAvailable: "true" })).status, 400);
      assert.equal(query.mock.callCount(), 0);
      assert.equal((await request("GET", tokenFor("counsellor"))).status, 404);
      assert.equal((await request("PUT", tokenFor("counsellor"), { isAvailable: false })).status, 404);
    } finally {
      query.mock.restore();
    }
  });

  it("accepts an unchanged availability value", async () => {
    const query = mock.method(db, "query", async (sql, params) => {
      if (sql.startsWith("UPDATE")) {
        assert.deepEqual(params, [false, 17]);
        return [{ affectedRows: 0 }];
      }
      assert.deepEqual(params, [17]);
      return [[{ id: 1 }]];
    });
    try {
      const response = await request("PUT", tokenFor("counsellor"), { isAvailable: false });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { isAvailable: false });
    } finally {
      query.mock.restore();
    }
  });

  it("sends a new emergency event to available counsellor rooms", async () => {
    let resolveWorker;
    let resolveAlert;
    const workerFinished = new Promise((resolve) => { resolveWorker = resolve; });
    const alertReceived = new Promise((resolve) => { resolveAlert = resolve; });
    const originalIo = global.io;
    const query = mock.method(db, "query", async (sql) => {
      if (sql.includes("INSERT INTO emergencies")) return [{ insertId: 501 }];
      if (sql.includes("FROM users u")) {
        assert.match(sql, /cp\.is_available = TRUE/);
        return [[{ id: 17, phone: null, email: null }]];
      }
      if (sql.includes("INSERT INTO emergency_notifications")) return [{ insertId: 1 }];
      if (sql.includes("FROM emergency_notifications")) {
        resolveWorker();
        return [[]];
      }
      throw new Error("Unexpected query in emergency test.");
    });
    global.io = {
      to: (room) => ({
        emit: (event, payload) => resolveAlert({ room, event, payload }),
      }),
    };

    try {
      let status;
      const res = {
        status(code) { status = code; return this; },
        json() { return this; },
      };
      await triggerEmergency({ user: { id: 23 }, body: { description: "Test" } }, res);
      const [alert] = await Promise.all([alertReceived, workerFinished]);
      assert.equal(status, 201);
      assert.equal(alert.room, "counsellor-17");
      assert.equal(alert.event, "emergencyAlert");
      assert.equal(alert.payload.emergencyId, 501);
    } finally {
      global.io = originalIo;
      query.mock.restore();
    }
  });
});
