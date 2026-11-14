import express from "express";
import * as phq9Controller from "../controllers/phq9Controller.js";
import { authMiddleware as verifyToken } from "../auth/authMiddleware.js";
import { ensurePatientAccess, requireRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/questions", verifyToken, phq9Controller.getPhq9Questions);
router.post("/start", verifyToken, phq9Controller.startPhq9Screening);
router.post("/:screeningId/answer", verifyToken, phq9Controller.submitPhq9Answer);
router.get("/history", verifyToken, phq9Controller.getOwnPhq9History);
router.get(
  "/patient/:patientId",
  verifyToken,
  requireRoles("counsellor", "admin", "supervisor"),
  ensurePatientAccess,
  phq9Controller.getPatientPhq9History
);

export default router;
