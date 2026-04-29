const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- Member 401: Secure Login ---
// POST /api/auth/login
router.post('/login', authController.login);

// --- Member 424: Anonymous Registration ---
// POST /api/auth/register/anonymous
router.post('/register/anonymous', (req, res) => {
    const anonId = 'anon_' + Math.random().toString(36).substring(2, 10);

    // Minimal anonymous user (privacy-first design)
    const anonymousUser = {
        id: anonId,
        role: 'anonymous'
    };

    // Note: In the future, this should also generate a JWT 
    // so Member 337 can protect the anonymous session.
    res.json(anonymousUser);
});

module.exports = router;