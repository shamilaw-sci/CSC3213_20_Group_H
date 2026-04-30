const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'Student']
        );

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key';
        const token = jwt.sign(
            { userId: result.insertId, role: 'Student' },
            secretKey,
            { expiresIn: '1h' }
        );

        return res.status(201).json({
            message: 'Registration successful.',
            token,
            role: 'Student'
        });

    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Query to find user by email. Adjust table/column names as necessary for your DB schema.
        const [rows] = await db.query('SELECT `id` as `userId`, `email`, `password`, `role` FROM `users` WHERE `email` = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = rows[0];

        // Password Verification
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // JWT Generation
        // Use process.env.JWT_SECRET or a default string for local dev (replace with secure key in prod)
        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key'; 
        
        // Payload: Extract userId and role
        const payload = {
            userId: user.userId,
            role: user.role
        };

        const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

        // Response
        return res.status(200).json({
            message: 'Login successful.',
            token,
            role: user.role
        });

    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
