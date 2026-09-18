import express from 'express';
import * as shardController from '../controllers/shardController.js';
import { authMiddleware as verifyToken } from '../auth/authMiddleware.js';

const router = express.Router();

// GET /api/shards/balance (Secured with JWT)
router.get('/balance', verifyToken, shardController.getBalance);

// POST /api/shards/earn (Secured with JWT)
router.post('/earn', verifyToken, shardController.earnShards);

// POST /api/shards/redeem (Secured with JWT)
router.post('/redeem', verifyToken, shardController.redeemForCounsellingUnlock);

export default router;
