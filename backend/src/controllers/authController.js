import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from "nodemailer";

import db from '../config/db.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: 'Name, email, and password are required.'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'Please provide a valid email address.'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters long.'
        });
    }

    try {
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: 'An account with this email already exists.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'Student']
        );

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key';

        const token = jwt.sign(
            {
                id: result.insertId,
                role: 'Student'
            },
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

        return res.status(500).json({
            message: 'Internal server error.'
        });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required.'
        });
    }

    try {
        const [rows] = await db.query(
            'SELECT `id` as `userId`, `email`, `password`, `role` FROM `users` WHERE `email` = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: 'Invalid credentials.'
            });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials.'
            });
        }

        const secretKey = process.env.JWT_SECRET || 'fallback_secret_key';

        const payload = {
            id: user.userId,
            role: user.role
        };

        const token = jwt.sign(
            payload,
            secretKey,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            message: 'Login successful.',
            token,
            userId: user.userId,
            role: user.role
        });

    } catch (error) {
        console.error('Error during login:', error);

        return res.status(500).json({
            message: 'Internal server error.'
        });
    }
};

export const anonymousLogin = async (req, res) => {
    try {
        const anonymousId =
            'anon_' + Math.random().toString(36).substring(2, 10);

        const [result] = await db.query(
            `INSERT INTO users
            (name, email, password, role, anonymousId, isAnonymous)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                'Anonymous User',
                null,
                null,
                'anonymous',
                anonymousId,
                true
            ]
        );

        const secretKey =
            process.env.JWT_SECRET || 'fallback_secret_key';

        const token = jwt.sign(
            {
                id: result.insertId,
                role: 'anonymous'
            },
            secretKey,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Anonymous login successful',
            token,
            user: {
                id: result.insertId,
                anonymousId,
                role: 'anonymous',
                isAnonymous: true
            }
        });

    } catch (error) {
        console.error('Anonymous login error:', error);

        res.status(500).json({
            message: error.message
        });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: 'Email is required.'
        });
    }

    try {
        const [rows] = await db.query(
            'SELECT id, name, email FROM users WHERE email = ?',
            [email]
        );

        // Use the same response whether the account exists or not.
        if (rows.length === 0) {
            return res.status(200).json({
                message:
                    'If an account exists with this email, a password reset link has been sent.'
            });
        }

        const user = rows[0];

        const resetToken = crypto.randomBytes(32).toString('hex');

        // Token is valid for 15 minutes.
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetToken, expiry, user.id]
        );

       const resetUrl =
    `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: `"CareBridge" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'CareBridge Password Reset',
            html: `
                <h2>Password Reset</h2>
                <p>Hello ${user.name || 'there'},</p>
                <p>We received a request to reset your CareBridge password.</p>
                <p>This link will expire in 15 minutes.</p>
                <p>
                    <a href="${resetUrl}">
                        Reset Your Password
                    </a>
                </p>
                <p>If you did not request this, you can safely ignore this email.</p>
                <p>CareBridge Team</p>
            `
        });

        return res.status(200).json({
            message:
                'If an account exists with this email, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);

        return res.status(500).json({
            message: 'Unable to process your request.'
        });
    }
};

export const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({
            message: 'Token and new password are required.'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters long.'
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT id FROM users
             WHERE reset_token = ?
             AND reset_token_expiry > NOW()`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                message: 'Invalid or expired reset token.'
            });
        }

        const userId = rows[0].id;

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `UPDATE users
             SET password = ?, reset_token = NULL, reset_token_expiry = NULL
             WHERE id = ?`,
            [hashedPassword, userId]
        );

        return res.status(200).json({
            message: 'Password reset successful.'
        });

    } catch (error) {
        console.error('Reset password error:', error);

        return res.status(500).json({
            message: 'Unable to reset password.'
        });
    }
};

export default {
    register,
    login,
    anonymousLogin,
    forgotPassword,
    resetPassword
};