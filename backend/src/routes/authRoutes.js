const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/register/anonymous
router.post('/register/anonymous', authController.anonymousLogin);

module.exports = router;