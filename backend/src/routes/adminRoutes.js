import express from 'express';
import { getAnalyticsDashboard, getAdminReport, updateUserStatus, verifyCounsellor } from '../controllers/adminController.js';
import { authMiddleware as verifyToken } from '../auth/authMiddleware.js';
import { verifyAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

router.get('/analytics', verifyToken, verifyAdmin, getAnalyticsDashboard);
router.get('/reports/:format', verifyToken, verifyAdmin, getAdminReport);
router.put('/users/:userId', verifyToken, verifyAdmin, updateUserStatus);
router.put('/counsellors/:counsellorId/verify', verifyToken, verifyAdmin, verifyCounsellor);

export default router;