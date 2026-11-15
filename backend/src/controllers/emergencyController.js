
import db from "../config/db.js";
import crypto from "crypto";

// --------------------------------------------------
// Student: Create an emergency request
// --------------------------------------------------
export const triggerEmergency = async (req, res) => {
    try {
        const studentId = req.user?.id;
        const studentName = req.user?.name;

        if (!studentId) {
            return res.status(401).json({
                message: "User authentication required."
            });
        }

        const [users] = await db.query(
            "SELECT email FROM users WHERE id = ?",
            [studentId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Student account not found."
            });
        }

        const studentEmail = users[0].email;

        // Generate one unique room ID for this request.
        const roomId = crypto.randomUUID();

        const [result] = await db.query(
            `INSERT INTO emergency_requests
                (student_id, student_name, student_email, room_id, status)
             VALUES (?, ?, ?, ?, ?)`,
            [
                studentId,
                studentName || "Student",
                studentEmail,
                roomId,
                "Pending"
            ]
        );

        const emergencyRequest = {
            id: result.insertId,
            student_id: studentId,
            student_name: studentName || "Student",
            student_email: studentEmail,
            room_id: roomId,
            status: "Pending"
        };

        // Notify connected clients that a new request is available.
        if (global.io) {
            global.io.emit("emergencyAlert", {
                emergencyId: result.insertId,
                studentId,
                studentName: studentName || "Student",
                studentEmail,
                roomId
            });
        }

        return res.status(201).json({
            success: true,
            message: "Emergency request created successfully.",
            request: emergencyRequest
        });

    } catch (error) {
        console.error("Trigger emergency error:", error);

        return res.status(500).json({
            message: "Unable to create emergency request."
        });
    }
};


// --------------------------------------------------
// Counsellor: Get all emergency requests
// --------------------------------------------------
export const getEmergencyRequests = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *
            FROM emergency_requests
            ORDER BY created_at DESC
        `);

        return res.json(rows);

    } catch (error) {
        console.error("Get emergency requests error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};


// --------------------------------------------------
// Counsellor: Accept an emergency request
// --------------------------------------------------
export const acceptEmergencyRequest = async (req, res) => {
    try {
        const { id } = req.params;

        // Get the existing request and its original room ID.
        const [rows] = await db.query(
            `SELECT *
             FROM emergency_requests
             WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Emergency request not found."
            });
        }

        const request = rows[0];

        if (request.status !== "Pending") {
            return res.status(409).json({
                message: `This request is already ${request.status}.`
            });
        }

        if (!request.room_id) {
            return res.status(500).json({
                message: "The emergency request has no room ID."
            });
        }

        // Do not generate another room ID here.
        const [result] = await db.query(
            `UPDATE emergency_requests
             SET status = 'Accepted'
             WHERE id = ? AND status = 'Pending'`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                message: "This request has already been accepted or updated."
            });
        }

        // Notify the student using the SAME room ID.
        if (global.io) {
            global.io.emit("emergency-call", {
                requestId: Number(id),
                studentId: request.student_id,
                studentName: request.student_name,
                studentEmail: request.student_email,
                roomId: request.room_id
            });
        }

        return res.json({
            success: true,
            roomId: request.room_id,
            requestId: Number(id),
            message: "Emergency request accepted."
        });

    } catch (error) {
        console.error("Accept emergency request error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};


// --------------------------------------------------
// Complete emergency request
// --------------------------------------------------
export const completeEmergencyRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE emergency_requests
             SET status = 'Completed'
             WHERE id = ? AND status = 'Accepted'`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Accepted emergency request not found."
            });
        }

        return res.json({
            success: true,
            message: "Emergency request completed."
        });

    } catch (error) {
        console.error("Complete emergency request error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};


// --------------------------------------------------
// Cancel emergency request
// --------------------------------------------------
export const cancelEmergencyRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE emergency_requests
             SET status = 'Cancelled'
             WHERE id = ? AND status IN ('Pending', 'Accepted')`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Active emergency request not found."
            });
        }

        return res.json({
            success: true,
            message: "Emergency request cancelled."
        });

    } catch (error) {
        console.error("Cancel emergency request error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};


// --------------------------------------------------
// Default export
// --------------------------------------------------
export default {
    triggerEmergency,
    getEmergencyRequests,
    acceptEmergencyRequest,
    completeEmergencyRequest,
    cancelEmergencyRequest
};
