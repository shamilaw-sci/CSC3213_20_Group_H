const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

router.post('/register/anonymous', (req, res) => {
    const anonId = 'anon_' + Math.random().toString(36).substring(2, 10);

    res.json({
        anonymousId: anonId
    });
});

module.exports = router;
