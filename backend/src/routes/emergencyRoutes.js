import express from 'express';
import * as emergencyController from '../controllers/emergencyController.js';
import { authMiddleware as verifyToken } from '../auth/authMiddleware.js';

const router = express.Router();

// POST /api/emergency (Secured with JWT)
router.post('/', verifyToken, emergencyController.triggerEmergency);

export default router;