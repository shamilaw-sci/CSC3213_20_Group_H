
import db from "../config/db.js";
import crypto from "crypto";

// --------------------------------------------------
// Student: Create an emergency request
// --------------------------------------------------
export const triggerEmergency = async (req, res) => {
    try {
        // 1. Verify authentication
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                error: "Authentication required to trigger an emergency alert."
            });
        }

        // 2. Get student information
        const studentId = req.user.id;
        const studentName = req.user.name || "Student";

        // Read optional request information
        const { description, aiConfidence } = req.body ?? {};

        // Note: description and aiConfidence are not stored because
        // the emergency_requests schema shared earlier has no such columns.

        // 3. Get student email
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

        // 4. Generate one unique room ID for this emergency request
        const roomId = crypto.randomUUID();

        // 5. Insert emergency request into database
        const [result] = await db.query(
            `INSERT INTO emergency_requests
                (student_id, student_name, student_email, room_id, status)
             VALUES (?, ?, ?, ?, ?)`,
            [
                studentId,
                studentName,
                studentEmail,
                roomId,
                "Pending"
            ]
        );

        const emergencyRequest = {
            id: result.insertId,
            student_id: studentId,
            student_name: studentName,
            student_email: studentEmail,
            room_id: roomId,
            status: "Pending"
        };

        // 6. Notify connected clients about the new request
        if (global.io) {
            global.io.emit("emergencyAlert", {
                emergencyId: result.insertId,
                studentId,
                studentName,
                studentEmail,
                roomId,
                description: description || null,
                aiConfidence: aiConfidence ?? null
            });
        }

        // 7. Send response
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

        // 1. Get the existing emergency request
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

        // 2. Check request status
        if (request.status !== "Pending") {
            return res.status(409).json({
                message: `This request is already ${request.status}.`
            });
        }

        // 3. Check existing room ID
        if (!request.room_id) {
            return res.status(500).json({
                message: "The emergency request has no room ID."
            });
        }

        // 4. Update status without generating a new room ID
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

        // 5. Notify the student using the SAME room ID
        if (global.io) {
            global.io.emit("emergency-call", {
                requestId: Number(id),
                studentId: request.student_id,
                studentName: request.student_name,
                studentEmail: request.student_email,
                roomId: request.room_id
            });
        }

        // 6. Return the existing room ID to the counsellor
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
             WHERE id = ?
             AND status IN ('Pending', 'Accepted')`,
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
