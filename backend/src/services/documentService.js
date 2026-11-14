import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFParse } from "pdf-parse";
import db from "../config/db.js";
import { summarizeMedicalDocument } from "./geminiService.js";
import { recordAuditLog } from "../utils/auditLogger.js";

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".txt", ".md", ".csv", ".json"]);
export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/octet-stream", // fallback when browser omits mime for .md/.txt
]);

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "patient-documents");

export class DocumentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export function validateUploadedFile(file) {
  if (!file) {
    throw new DocumentValidationError("A document file is required.");
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
    throw new DocumentValidationError(
      `Unsupported file format (${ext || "unknown"}). Allowed formats: PDF, TXT, MD, CSV, JSON.`
    );
  }

  if (file.mimeType && !ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimeType)) {
    throw new DocumentValidationError(`Unsupported MIME type: ${file.mimeType}`);
  }
  if (file.mimetype && !ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
    throw new DocumentValidationError(`Unsupported MIME type: ${file.mimetype}`);
  }

  if (!file.size || file.size <= 0) {
    throw new DocumentValidationError("Uploaded file is empty.");
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new DocumentValidationError("File size exceeds the 10 MB limit.");
  }
}

export async function extractTextFromBuffer(buffer, originalFilename, mimeType) {
  const ext = path.extname(originalFilename || "").toLowerCase();
  if (ext === ".pdf" || mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return String(result?.text || "").trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  return buffer.toString("utf8").trim();
}

export async function storePatientDocument({
  patientId,
  uploadedBy,
  actorRole,
  file,
  consentConfirmed = false,
}) {
  validateUploadedFile(file);

  const patientDir = path.join(UPLOAD_ROOT, String(patientId));
  await fs.mkdir(patientDir, { recursive: true });

  const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBase}`;
  const absolutePath = path.join(patientDir, uniqueName);
  const relativePath = path.relative(process.cwd(), absolutePath);

  await fs.writeFile(absolutePath, file.buffer);

  let extractedText = "";
  try {
    extractedText = await extractTextFromBuffer(file.buffer, file.originalname, file.mimetype);
  } catch (err) {
    console.warn(`Text extraction warning for ${file.originalname}:`, err.message);
  }

  const [result] = await db.query(
    `INSERT INTO patient_documents
      (patient_id, uploaded_by, original_filename, storage_path, mime_type, file_size, extracted_text, consent_confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      patientId,
      uploadedBy,
      file.originalname,
      relativePath,
      file.mimetype || "application/octet-stream",
      file.size,
      extractedText || null,
      Boolean(consentConfirmed),
    ]
  );

  await recordAuditLog({
    actorId: uploadedBy,
    actorRole,
    action: "PATIENT_DOCUMENT_UPLOADED",
    entityType: "patient_document",
    entityId: result.insertId,
    details: {
      patientId,
      filename: file.originalname,
      size: file.size,
      consentConfirmed: Boolean(consentConfirmed),
    },
  });

  const [rows] = await db.query(
    `SELECT id, patient_id AS patientId, uploaded_by AS uploadedBy,
            original_filename AS originalFilename, mime_type AS mimeType,
            file_size AS fileSize, consent_confirmed AS consentConfirmed,
            created_at AS createdAt,
            (extracted_text IS NOT NULL AND CHAR_LENGTH(extracted_text) > 0) AS hasExtractedText
     FROM patient_documents
     WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}

export async function generateDocumentSummary({ documentId, actorId, actorRole, consentConfirmed }) {
  const [docs] = await db.query(`SELECT * FROM patient_documents WHERE id = ? LIMIT 1`, [documentId]);
  if (docs.length === 0) {
    return null;
  }

  const doc = docs[0];
  const effectiveConsent = Boolean(consentConfirmed || doc.consent_confirmed);
  if (!effectiveConsent) {
    throw new DocumentValidationError(
      "Explicit patient/administrative data-processing consent confirmation is required before sending document text to Gemini."
    );
  }

  if (consentConfirmed && !doc.consent_confirmed) {
    await db.query(`UPDATE patient_documents SET consent_confirmed = TRUE WHERE id = ?`, [documentId]);
  }

  if (!doc.extracted_text || !doc.extracted_text.trim()) {
    throw new DocumentValidationError(
      "No readable text could be extracted from this document for AI summarization."
    );
  }

  const summaryJson = await summarizeMedicalDocument({
    extractedText: doc.extracted_text,
    filename: doc.original_filename,
  });

  const modelUsed = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const [result] = await db.query(
    `INSERT INTO document_summaries (document_id, patient_id, summary_json, model_used, review_status)
     VALUES (?, ?, ?, ?, 'pending_review')`,
    [documentId, doc.patient_id, JSON.stringify(summaryJson), modelUsed]
  );

  await recordAuditLog({
    actorId,
    actorRole,
    action: "DOCUMENT_AI_SUMMARY_GENERATED",
    entityType: "document_summary",
    entityId: result.insertId,
    details: { documentId, patientId: doc.patient_id, modelUsed },
  });

  const [rows] = await db.query(
    `SELECT id, document_id AS documentId, patient_id AS patientId,
            summary_json AS summaryJson, model_used AS modelUsed,
            review_status AS reviewStatus, reviewed_by AS reviewedBy,
            reviewed_at AS reviewedAt, reviewer_notes AS reviewerNotes,
            created_at AS createdAt
     FROM document_summaries WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}
