const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');

// LOGIN
router.post('/login', authController.login);

router.post('/register/anonymous', (req, res) => {

    const anonId = 'anon_' + Math.random().toString(36).substring(2, 10);

    const user = {
        id: anonId,
        role: 'anonymous'
    };

    const token = jwt.sign(
        user,
        "SECRET_KEY_123",
        { expiresIn: "1h" }
    );

    return res.json({
        token,
        anonymousId: anonId,
        role: "anonymous"
    });
});

module.exports = router;