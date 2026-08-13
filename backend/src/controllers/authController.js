const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

exports.login = async (req, res) => {
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

exports.anonymousLogin = async (req, res) => {
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

        // Fixed: Use the newly inserted ID and role directly from the result and logic
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

// =====================================================
// FORGOT PASSWORD
// =====================================================

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Email address is required."
        });
    }

    try {
        // Find user
        const [users] = await db.query(
            "SELECT id, name, email FROM users WHERE email = ?",
            [email]
        );

        // Do not reveal whether email exists
        if (users.length === 0) {
            return res.status(200).json({
                message:
                    "If an account with that email exists, a password reset link has been sent."
            });
        }

        const user = users[0];

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Token expires in 15 minutes
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        // Save token
        await db.query(
            `UPDATE users
             SET reset_token = ?, reset_token_expiry = ?
             WHERE id = ?`,
            [resetToken, expiry, user.id]
        );

        // Reset URL
        const resetUrl =
            `http://localhost:3000/reset-password?token=${resetToken}`;

        // Email transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });

        // Send email
        await transporter.sendMail({
            from: `"CareBridge" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "CareBridge Password Reset",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                    <h2 style="color: #2563eb;">
                        CareBridge
                    </h2>

                    <p>Hello ${user.name || "there"},</p>

                    <p>
                        We received a request to reset your CareBridge password.
                    </p>

                    <p>
                        Click the button below to create a new password:
                    </p>

                    <a
                        href="${resetUrl}"
                        style="
                            display:inline-block;
                            padding:12px 24px;
                            background:#2563eb;
                            color:white;
                            text-decoration:none;
                            border-radius:8px;
                        "
                    >
                        Reset Password
                    </a>

                    <p style="margin-top:20px;">
                        This link will expire in 15 minutes.
                    </p>

                    <p>
                        If you did not request this, you can safely ignore this email.
                    </p>

                    <p>
                        — CareBridge Team
                    </p>
                </div>
            `,
        });

        return res.status(200).json({
            message:
                "If an account with that email exists, a password reset link has been sent."
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            message: "Unable to process password reset request."
        });
    }
};


// =====================================================
// RESET PASSWORD
// =====================================================

exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({
            message: "Reset token and new password are required."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters long."
        });
    }

    try {
        // Find valid token
        const [users] = await db.query(
            `SELECT id
             FROM users
             WHERE reset_token = ?
             AND reset_token_expiry > NOW()`,
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired password reset link."
            });
        }

        const userId = users[0].id;

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and remove reset token
        await db.query(
            `UPDATE users
             SET password = ?,
                 reset_token = NULL,
                 reset_token_expiry = NULL
             WHERE id = ?`,
            [hashedPassword, userId]
        );

        return res.status(200).json({
            message:
                "Password reset successful. You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Unable to reset password."
        });
    }
};