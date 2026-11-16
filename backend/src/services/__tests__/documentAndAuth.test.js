import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DocumentValidationError,
  MAX_DOCUMENT_SIZE_BYTES,
  extractTextFromBuffer,
  validateUploadedFile,
} from "../documentService.js";
import {
  ensurePatientAccess,
  requireRoles,
} from "../../middlewares/roleMiddleware.js";
import { recordVoiceTurn } from "../../controllers/voiceController.js";

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

describe("Document Upload Validation & Text Extraction", () => {
  test("accepts valid PDF and TXT files within size limit", async () => {
    assert.doesNotThrow(() =>
      validateUploadedFile({
        originalname: "history.pdf",
        mimetype: "application/pdf",
        size: 1024,
      })
    );

    const txt = await extractTextFromBuffer(
      Buffer.from("Patient history: mild insomnia in 2024."),
      "notes.txt",
      "text/plain"
    );
    assert.match(txt, /mild insomnia/);
  });

  test("rejects unsupported file extensions, empty files, and oversized files", () => {
    assert.throws(
      () =>
        validateUploadedFile({
          originalname: "payload.exe",
          mimetype: "application/octet-stream",
          size: 100,
        }),
      DocumentValidationError
    );

    assert.throws(
      () =>
        validateUploadedFile({
          originalname: "empty.txt",
          mimetype: "text/plain",
          size: 0,
        }),
      DocumentValidationError
    );

    assert.throws(
      () =>
        validateUploadedFile({
          originalname: "huge.pdf",
          mimetype: "application/pdf",
          size: MAX_DOCUMENT_SIZE_BYTES + 1,
        }),
      DocumentValidationError
    );
  });
});

describe("Role-Based & Patient-Level Access Control", () => {
  test("requireRoles blocks unauthorized roles and passes authorized roles", () => {
    const guard = requireRoles("admin", "counsellor");
    let calledNext = false;

    const studentRes = createMockRes();
    guard({ user: { id: 1, role: "student" } }, studentRes, () => {
      calledNext = true;
    });
    assert.equal(studentRes.statusCode, 403);
    assert.equal(calledNext, false);

    const counsellorRes = createMockRes();
    guard({ user: { id: 2, role: "counsellor" } }, counsellorRes, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
  });

  test("ensurePatientAccess prevents students from reading another patient's record", async () => {
    let calledNext = false;
    const res = createMockRes();

    await ensurePatientAccess(
      { user: { id: 10, role: "student" }, params: { patientId: "11" } },
      res,
      () => {
        calledNext = true;
      }
    );

    assert.equal(res.statusCode, 403);
    assert.equal(calledNext, false);

    await ensurePatientAccess(
      { user: { id: 10, role: "student" }, params: { patientId: "10" } },
      createMockRes(),
      () => {
        calledNext = true;
      }
    );
    assert.equal(calledNext, true);
  });

  test("ensurePatientAccess grants admin access and rejects missing auth", async () => {
    let calledNext = false;
    const adminRes = createMockRes();
    await ensurePatientAccess(
      { user: { id: 1, role: "admin" }, params: { patientId: "99" } },
      adminRes,
      () => {
        calledNext = true;
      }
    );
    assert.equal(calledNext, true);

    const noAuthRes = createMockRes();
    await ensurePatientAccess({ user: undefined, params: { patientId: "99" } }, noAuthRes, () => {});
    assert.equal(noAuthRes.statusCode, 401);
  });
});

describe("Voice Turn Input Validation", () => {
  test("rejects empty or oversized voice transcripts before DB/LLM", async () => {
    const emptyRes = createMockRes();
    await recordVoiceTurn({ user: { id: 1 }, body: { userTranscript: "   " } }, emptyRes);
    assert.equal(emptyRes.statusCode, 400);

    const longRes = createMockRes();
    await recordVoiceTurn(
      { user: { id: 1 }, body: { userTranscript: "a".repeat(4001) } },
      longRes
    );
    assert.equal(longRes.statusCode, 400);
  });
});
