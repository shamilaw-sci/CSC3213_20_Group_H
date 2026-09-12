import express from "express";
import * as chatController from "../controllers/chatController.js";
import { authMiddleware as verifyToken } from "../auth/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, chatController.getHistory);
router.post("/", verifyToken, chatController.sendMessage);

export default router;
