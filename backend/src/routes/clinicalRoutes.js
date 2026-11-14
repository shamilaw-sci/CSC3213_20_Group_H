import express from "express";
import multer from "multer";
import * as clinicalController from "../controllers/clinicalController.js";
import { authMiddleware as verifyToken } from "../auth/authMiddleware.js";
import { ensurePatientAccess, requireRoles } from "../middlewares/roleMiddleware.js";
import { MAX_DOCUMENT_SIZE_BYTES } from "../services/documentService.js";
import db from "../config/db.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
});

const staffOnly = requireRoles("counsellor", "admin", "supervisor");
const adminOnly = requireRoles("admin", "supervisor");

router.get("/overview", verifyToken, staffOnly, clinicalController.getClinicalOverview);
router.get("/patients", verifyToken, staffOnly, clinicalController.listClinicalPatients);
router.get(
  "/patients/:patientId",
  verifyToken,
  staffOnly,
  ensurePatientAccess,
  clinicalController.getPatientDetail
);

router.put("/risk-assessments/:id/review", verifyToken, staffOnly, clinicalController.reviewRiskAssessment);

router.get("/alerts", verifyToken, staffOnly, clinicalController.listAlerts);
router.put("/alerts/:id/acknowledge", verifyToken, staffOnly, clinicalController.acknowledgeAlert);
router.put("/alerts/:id/resolve", verifyToken, staffOnly, clinicalController.resolveAlert);
router.post("/alerts/escalate-overdue", verifyToken, staffOnly, clinicalController.triggerOverdueEscalation);

router.get("/counsellors", verifyToken, staffOnly, clinicalController.listAvailableCounsellors);
router.post("/assignments", verifyToken, adminOnly, clinicalController.assignPatientToCounsellor);

router.post(
  "/patients/:patientId/notes",
  verifyToken,
  staffOnly,
  ensurePatientAccess,
  clinicalController.addCounsellorNote
);
router.post(
  "/patients/:patientId/follow-ups",
  verifyToken,
  staffOnly,
  ensurePatientAccess,
  clinicalController.createFollowUp
);
router.put("/follow-ups/:id", verifyToken, staffOnly, clinicalController.updateFollowUp);

router.post(
  "/patients/:patientId/documents",
  verifyToken,
  staffOnly,
  ensurePatientAccess,
  upload.single("document"),
  clinicalController.uploadPatientDocument
);

// Middleware to resolve patientId from document before checking patient-level access
async function attachDocumentPatientId(req, res, next) {
  try {
    const [rows] = await db.query(`SELECT patient_id FROM patient_documents WHERE id = ? LIMIT 1`, [
      Number(req.params.docId),
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Document not found." });
    }
    req.params.patientId = rows[0].patient_id;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Could not verify document access." });
  }
}

router.get(
  "/documents/:docId/download",
  verifyToken,
  staffOnly,
  attachDocumentPatientId,
  ensurePatientAccess,
  clinicalController.downloadPatientDocument
);
router.post(
  "/documents/:docId/summarize",
  verifyToken,
  staffOnly,
  attachDocumentPatientId,
  ensurePatientAccess,
  clinicalController.summarizeDocument
);
router.put(
  "/document-summaries/:summaryId/review",
  verifyToken,
  staffOnly,
  clinicalController.reviewDocumentSummary
);

router.get("/audit-logs", verifyToken, adminOnly, clinicalController.listAuditLogs);

export default router;
