const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

// Correct: Destructure authMiddleware and rename/alias it to verifyToken
const { authMiddleware: verifyToken } = require('../auth/authMiddleware');

// POST /api/emergency (Secured with JWT)
router.post('/', verifyToken, emergencyController.triggerEmergency);

module.exports = router;