import express from "express";
import { authMiddleware as verifyToken } from "../auth/authMiddleware.js";
import * as notificationController from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", verifyToken, notificationController.getNotifications);
router.put("/:id/read", verifyToken, notificationController.markNotificationRead);

export default router;
