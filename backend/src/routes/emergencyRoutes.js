import express from 'express';
import * as emergencyController from '../controllers/emergencyController.js';
import { authMiddleware as authenticateToken } from '../auth/authMiddleware.js';

const router = express.Router();

router.post('/', authenticateToken, emergencyController.triggerEmergency);

export default router;