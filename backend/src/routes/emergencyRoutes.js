const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { verifyToken } = require('../middlewares/authMiddleware'); // Align with your token checker

// POST /api/emergency (Secured with JWT)
router.post('/', verifyToken, emergencyController.triggerEmergency);

module.exports = router;