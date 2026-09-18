import express from "express";
import * as chatController from "../controllers/chatController.js";
import { authMiddleware as verifyToken } from "../auth/authMiddleware.js";
import { validateChatMessage } from "../middleware/chatValidation.js";
import { chatMessageLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/", verifyToken, chatController.getHistory);
router.post(
  "/",
  verifyToken,
  chatMessageLimiter,
  validateChatMessage,
  chatController.sendMessage
);

export default router;
