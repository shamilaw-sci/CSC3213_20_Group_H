import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import db from "../config/db.js";

// =====================================================
// REGISTER
// =====================================================

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email, and password are required."
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: "Please provide a valid email address."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters long."
        });
    }

    try {
        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                email,
                hashedPassword,
                "Student"
            ]
        );

        const secretKey =
            process.env.JWT_SECRET || "fallback_secret_key";

        const token = jwt.sign(
            {
                id: result.insertId,
                role: "Student"
            },
            secretKey,
            {
                expiresIn: "1h"
            }
        );

        return res.status(201).json({
            message: "Registration successful.",
            token,
            user: {
                id: result.insertId,
                role: "Student"
            }
        });

    } catch (error) {
        console.error("Error during registration:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// LOGIN
// =====================================================

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT
                id AS userId,
                email,
                password,
                role
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid credentials."
            });
        }

        const user = rows[0];

        // Prevent login problems for users without passwords
        if (!user.password) {
            return res.status(401).json({
                message: "This account does not have a password. Please use the appropriate login method."
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials."
            });
        }

        const secretKey =
            process.env.JWT_SECRET || "fallback_secret_key";

        const userRole =
            String(user.role || "Student").toLowerCase();

        const token = jwt.sign(
            {
                id: user.userId,
                role: userRole
            },
            secretKey,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            userId: user.userId,
            role: userRole
        });

    } catch (error) {
        console.error("Error during login:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// ANONYMOUS LOGIN
// =====================================================

export const anonymousLogin = async (req, res) => {
    try {
        const anonymousId =
            "anon_" +
            Math.random()
                .toString(36)
                .substring(2, 10);

        const [result] = await db.query(
            `INSERT INTO users
            (
                name,
                email,
                password,
                role,
                anonymousId,
                isAnonymous
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                "Anonymous User",
                null,
                null,
                "Student",
                anonymousId,
                true
            ]
        );

        const secretKey =
            process.env.JWT_SECRET || "fallback_secret_key";

        const token = jwt.sign(
            {
                id: result.insertId,
                role: "student",
                isAnonymous: true
            },
            secretKey,
            {
                expiresIn: "1h"
            }
        );

        return res.status(201).json({
            message: "Anonymous login successful",

            token,

            user: {
                id: result.insertId,
                anonymousId,
                name: "Anonymous User",
                role: "student",
                isAnonymous: true
            }
        });

    } catch (error) {
        console.error(
            "Anonymous login error:",
            error
        );

        return res.status(500).json({
            message: "Anonymous login failed."
        });
    }
};


// =====================================================
// FORGOT PASSWORD
// =====================================================

export const forgotPassword = async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Email address is required."
        });
    }

    try {

        // -------------------------------------------------
        // Find user
        // -------------------------------------------------

        const [users] = await db.query(
            `SELECT id, name, email
             FROM users
             WHERE email = ?`,
            [email]
        );

        // -------------------------------------------------
        // Do not reveal whether account exists
        // -------------------------------------------------

        if (users.length === 0) {
            return res.status(200).json({
                message:
                    "If an account with that email exists, a password reset link has been sent."
            });
        }

        const user = users[0];

        // -------------------------------------------------
        // Generate secure reset token
        // -------------------------------------------------

        const resetToken =
            crypto.randomBytes(32).toString("hex");

        // Token expires after 15 minutes
        const expiry =
            new Date(Date.now() + 15 * 60 * 1000);

        // -------------------------------------------------
        // Save reset token
        // -------------------------------------------------

        await db.query(
            `UPDATE users
             SET reset_token = ?,
                 reset_token_expiry = ?
             WHERE id = ?`,
            [
                resetToken,
                expiry,
                user.id
            ]
        );

        // -------------------------------------------------
        // Reset URL
        // -------------------------------------------------

        const resetUrl =
            `http://localhost:3000/reset-password?token=${resetToken}`;

        // -------------------------------------------------
        // Create Gmail transporter
        // -------------------------------------------------

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });

        // -------------------------------------------------
        // Send password reset email
        // -------------------------------------------------

        await transporter.sendMail({
            from: `"CareBridge" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "CareBridge Password Reset",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                ">

                    <h2 style="color: #2563eb;">
                        CareBridge
                    </h2>

                    <p>
                        Hello ${user.name || "there"},
                    </p>

                    <p>
                        We received a request to reset
                        your CareBridge password.
                    </p>

                    <p>
                        Click the button below to create
                        a new password:
                    </p>

                    <div style="margin: 30px 0;">

                        <a
                            href="${resetUrl}"
                            style="
                                display: inline-block;
                                padding: 12px 24px;
                                background: #2563eb;
                                color: white;
                                text-decoration: none;
                                border-radius: 8px;
                                font-weight: bold;
                            "
                        >
                            Reset Password
                        </a>

                    </div>

                    <p>
                        This link will expire in
                        <strong>15 minutes</strong>.
                    </p>

                    <p>
                        If you did not request a password
                        reset, you can safely ignore this email.
                    </p>

                    <p>
                        — CareBridge Team
                    </p>

                </div>
            `,
        });

        console.log(
            "Password reset email sent to:",
            user.email
        );

        // -------------------------------------------------
        // Success
        // -------------------------------------------------

        return res.status(200).json({
            message:
                "If an account with that email exists, a password reset link has been sent."
        });

    } catch (error) {

        console.error(
            "Forgot password error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to process password reset request."
        });
    }
};


// =====================================================
// RESET PASSWORD
// =====================================================

export const resetPassword = async (req, res) => {

    const {
        token,
        password
    } = req.body;

    // -------------------------------------------------
    // Validate input
    // -------------------------------------------------

    if (!token || !password) {
        return res.status(400).json({
            message:
                "Reset token and new password are required."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message:
                "Password must be at least 8 characters long."
        });
    }

    try {

        // -------------------------------------------------
        // Find valid reset token
        // -------------------------------------------------

        const [users] = await db.query(
            `SELECT id
             FROM users
             WHERE reset_token = ?
             AND reset_token_expiry > NOW()`,
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                message:
                    "Invalid or expired password reset link."
            });
        }

        const userId =
            users[0].id;

        // -------------------------------------------------
        // Hash new password
        // -------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        // -------------------------------------------------
        // Update password
        // -------------------------------------------------

        await db.query(
            `UPDATE users
             SET password = ?,
                 reset_token = NULL,
                 reset_token_expiry = NULL
             WHERE id = ?`,
            [
                hashedPassword,
                userId
            ]
        );

        return res.status(200).json({
            message:
                "Password reset successful. You can now log in with your new password."
        });

    } catch (error) {

        console.error(
            "Reset password error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to reset password."
        });
    }
};
