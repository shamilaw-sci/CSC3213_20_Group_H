
import express from "express";
import * as emergencyController from "../controllers/emergencyController.js";

import {
    authMiddleware as authenticateToken
} from "../auth/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// Student: Trigger emergency
// POST /api/emergency
// --------------------------------------------------
router.post(
    "/",
    authenticateToken,
    emergencyController.triggerEmergency
);


// --------------------------------------------------
// Counsellor: Get all emergency requests
// GET /api/emergency/requests
// --------------------------------------------------
router.get(
    "/requests",
    authenticateToken,
    emergencyController.getEmergencyRequests
);


// --------------------------------------------------
// Counsellor: Accept emergency request
// PUT /api/emergency/:id/accept
// --------------------------------------------------
router.put(
    "/:id/accept",
    authenticateToken,
    emergencyController.acceptEmergencyRequest
);


// --------------------------------------------------
// Counsellor: Complete emergency request
// PUT /api/emergency/:id/complete
// --------------------------------------------------
router.put(
    "/:id/complete",
    authenticateToken,
    emergencyController.completeEmergencyRequest
);


// --------------------------------------------------
// Cancel emergency request
// PUT /api/emergency/:id/cancel
// --------------------------------------------------
router.put(
    "/:id/cancel",
    authenticateToken,
    emergencyController.cancelEmergencyRequest
);

export default router;
