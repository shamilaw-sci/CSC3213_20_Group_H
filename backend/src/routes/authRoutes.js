const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

// --- Member 424: Anonymous Registration ---
// POST /api/auth/register/anonymous
router.post('/register/anonymous', (req, res) => {

    const anonId = 'anon_' + Math.random().toString(36).substring(2, 10);

    const user = {
        id: anonId,
        role: 'anonymous'
    };

    res.json(anonymousUser);
});

module.exports = router;
