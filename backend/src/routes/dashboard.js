const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();


// =====================================================
// ADMIN DASHBOARD AUTHENTICATION
// =====================================================

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const secret = process.env.JWT_SECRET || "mind-ease-secret-key";

        const decoded = jwt.verify(token, secret);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Token expired or invalid"
        });

    }
};


// =====================================================
// ADMIN DASHBOARD
// GET /api/dashboard
// =====================================================

router.get("/", authMiddleware, async (req, res) => {

    try {

        // Only administrators can access this dashboard
        if (String(req.user.role).toLowerCase() !== "admin") {
            return res.status(403).json({
                message: "Admin access required"
            });
        }


        // Count students
        const [studentRows] = await db.query(
            `
            SELECT COUNT(*) AS totalStudents
            FROM users
            WHERE LOWER(role) = 'student'
            `
        );


        // Count professionals
        const [professionalRows] = await db.query(
            `
            SELECT COUNT(*) AS totalProfessionals
            FROM users
            WHERE LOWER(role) IN (
                'counsellor',
                'counselor',
                'psychologist',
                'professional'
            )
            `
        );


        // Total users
        const [userRows] = await db.query(
            `
            SELECT COUNT(*) AS totalUsers
            FROM users
            `
        );


        return res.status(200).json({

            success: true,

            stats: {
                totalStudents: studentRows[0].totalStudents,
                totalProfessionals: professionalRows[0].totalProfessionals,
                totalUsers: userRows[0].totalUsers,

                // These tables do not exist yet
                totalAppointments: null,
                totalAssessments: null
            },

            user: req.user

        });

    } catch (error) {

        console.error("Admin dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard data"
        });

    }
});


module.exports = router;