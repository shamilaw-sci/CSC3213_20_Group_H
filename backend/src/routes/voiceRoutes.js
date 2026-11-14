import express from "express";
import * as voiceController from "../controllers/voiceController.js";
import { authMiddleware as verifyToken } from "../auth/authMiddleware.js";
import { chatMessageLimiter, voiceSessionLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/session", verifyToken, voiceSessionLimiter, voiceController.createVoiceSession);
router.post("/turn", verifyToken, chatMessageLimiter, voiceController.recordVoiceTurn);

export default router;
