import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import db from '../config/db.js';

export const register = async (req, res) => {
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
            { id: result.insertId, role: 'Student' },
            secretKey,
            { expiresIn: '1h' }
        );

        return res.status(201).json({
            message: 'Registration successful.',
            token,
            user: {
                id: result.insertId,
                role: 'Student'
            }
        });

    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const [rows] = await db.query('SELECT `id` as `userId`, `email`, `password`, `role` FROM `users` WHERE `email` = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key'; 
        
        const payload = {
            id: user.userId,
            role: user.role
        };

        const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

        return res.status(200).json({
            message: 'Login successful.',
            token,
            userId: user.userId,
            role: user.role
        });

    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const anonymousLogin = async (req, res) => {
    try {
        const anonymousId = "anon_" + Math.random().toString(36).substring(2, 10);

        const [result] = await db.query(
            `INSERT INTO users 
            (name, email, password, role, anonymousId, isAnonymous)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                "Anonymous User",
                null,
                null,
                "anonymous",
                anonymousId,
                true
            ]
        );

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key';

        const token = jwt.sign(
            {
                id: result.insertId,
                role: "anonymous"
            },
            secretKey,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: "Anonymous login successful",
            token,
            user: {
                id: result.insertId,
                anonymousId,
                role: "anonymous",
                isAnonymous: true
            }
        });

    } catch(error) {
        console.error("Anonymous login error:", error);
        res.status(500).json({
            message: error.message
        });
    }
};

export default {
    register,
    login,
    anonymousLogin,
};