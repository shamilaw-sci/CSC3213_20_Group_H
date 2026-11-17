
import db from '../config/db.js';
import { assessSeverity, ValidationError } from '../utils/riskAssessment.js';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

async function getAvailableCounsellors() {
    const [rows] = await db.query(`
        SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            cp.is_available
        FROM users u
        JOIN counsellor_profiles cp
            ON u.id = cp.user_id
        WHERE u.role = 'counsellor'
        AND cp.is_available = TRUE
    `);

    return rows;
}

// =====================================================
// 1. TRIGGER EMERGENCY
// =====================================================

export const triggerEmergency = async (req, res) => {

    // Verify authentication
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required to trigger an emergency alert.',
            error: 'Authentication required to trigger an emergency alert.'
        });
    }

    const studentId = req.user.id;
    const { description, aiConfidence } = req.body ?? {};

    let severityScore;
    let fallbackTriggered;
    let matchedKeywords;
    let normalizedDescription;
    let normalizedConfidence;

    // Assess emergency severity
    try {
        ({
            severityScore,
            fallbackTriggered,
            matchedKeywords,
            aiConfidence: normalizedConfidence,
            description: normalizedDescription,
        } = assessSeverity({ description, aiConfidence }));

    } catch (error) {

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }

        console.error('Unexpected error assessing emergency severity:', error);

        return res.status(500).json({
            success: false,
            message: 'Critical system error processing emergency request.',
            error: 'Critical system error processing emergency request.'
        });
    }

    // Save emergency to MySQL
    try {

        const [result] = await db.query(
            `INSERT INTO emergencies
            (student_id, severity_score, description, ai_confidence, fallback_triggered, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                studentId,
                severityScore,
                normalizedDescription || 'Immediate crisis assistance requested',
                normalizedConfidence,
                fallbackTriggered,
                'Pending_Acknowledgment'
            ]
        );

        const emergencyId = result.insertId;
        const availableCounsellors = await getAvailableCounsellors();

        // Queue the notification before acknowledging the emergency request.
        await db.query(
            `INSERT INTO emergency_notifications
            (emergency_id, channel, recipient, payload, status)
            VALUES (?, 'email', 'DISPATCH_GROUP', ?, 'PENDING')`,
            [
                emergencyId,
                JSON.stringify({
                    emergencyId,
                    studentId,
                    severityScore,
                    description: normalizedDescription,
                    fallbackTriggered,
                    matchedKeywords,
                    recipients: availableCounsellors
                })
            ]
        );

        // Immediately acknowledge the student
        res.status(201).json({
            success: true,
            message: 'Your help request has been received and recorded. The response team is being notified.',
            emergencyId,
            severity: severityScore
        });

        setImmediate(async () => {
            try {
                const { processPendingNotifications } = await import(
                    '../services/notificationWorker.js'
                );

                await processPendingNotifications();
            } catch (error) {
                console.error(
                    '[NOTIFICATIONS] Immediate processing error:',
                    error
                );
            }
        });

        // =====================================================
        // 2. BACKGROUND EMERGENCY NOTIFICATIONS
        // =====================================================

        // Offload socket alerts and escalation checks asynchronously.
        setImmediate(async () => {
            try {
                console.log(
                    `[EMERGENCY] ${availableCounsellors.length} available counsellors found.`
                );

                const noCounsellorsAvailable =
                    availableCounsellors.length === 0;

                // Escalate to administrators if no counsellors are available.
                if (noCounsellorsAvailable) {
                    console.warn(
                        `[ESCALATION] No counsellors available for Emergency #${emergencyId}. Escalating to Admin/Supervisor.`
                    );

                    const [admins] = await db.query(`
                SELECT
                    id,
                    name,
                    email,
                    phone
                FROM users
                WHERE role IN ('admin', 'supervisor')
                AND is_suspended = FALSE
            `);

                    console.log(
                        `[ESCALATION] ${admins.length} active administrators/supervisors found.`
                    );

                    // Broadcast high-priority escalation to administrators
                    if (global.io) {
                        global.io.to('admin-room').emit(
                            'unattendedEmergencyEscalation',
                            {
                                emergencyId,
                                studentId,
                                severityScore,
                                fallbackTriggered,
                                description: normalizedDescription ||
                                    'Immediate crisis assistance requested',
                                reason: 'ZERO_COUNSELLORS_AVAILABLE',
                                priority: 'CRITICAL',
                                timestamp: new Date().toISOString()
                            }
                        );
                    }
                }

                // Broadcast the normal emergency alert to counsellors.
                if (global.io) {
                    const alert = {
                        emergencyId,
                        studentId,
                        severityScore,
                        fallbackTriggered,
                        description: normalizedDescription ||
                            'Immediate crisis assistance requested',
                        timestamp: new Date().toISOString(),
                        targetedCounsellors: availableCounsellors.map(
                            counsellor => counsellor.id
                        )
                    };

                    for (const counsellor of availableCounsellors) {
                        global.io
                            .to(`counsellor-${counsellor.id}`)
                            .emit('emergencyAlert', alert);
                    }
                }

            } catch (bgError) {
                console.error(
                    'Background emergency escalation error:',
                    bgError
                );
            }
        });

    } catch (error) {

        console.error('Emergency trigger failure:', error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Critical system error processing emergency request.',
                error: 'Critical system error processing emergency request.'
            });
        }
    }
};


// =====================================================
// 3. REDUNDANT NOTIFICATION DISPATCH
// =====================================================



export async function dispatchRedundantNotifications(details) {
    try {
        let emailSent = false;
        let smsSent = false;

        const recipients = details.recipients || [];

        const isAdminEscalation = Boolean(details.isAdminEscalation);

        const alertPrefix = isAdminEscalation
            ? '[ADMIN ESCALATION - NO COUNSELLORS AVAILABLE]'
            : '[URGENT CRISIS ALERT]';

        // ==========================================
        // COLLECT EMAIL RECIPIENTS
        // ==========================================

        const databaseEmailRecipients = recipients
            .map(recipient => recipient.email)
            .filter(Boolean);

        const emailRecipients = databaseEmailRecipients.length > 0
            ? databaseEmailRecipients
            : getConfiguredRecipients('ON_CALL_COUNSELLOR_EMAILS');

        // ==========================================
        // COLLECT PHONE RECIPIENTS
        // ==========================================

        const databasePhoneRecipients = recipients
            .map(recipient => recipient.phone)
            .filter(Boolean);

        const phoneRecipients = databasePhoneRecipients.length > 0
            ? databasePhoneRecipients
            : getConfiguredRecipients('ON_CALL_COUNSELLOR_PHONES');

        // ==========================================
        // CHANNEL 1: EMAIL VIA SENDGRID
        // ==========================================

        if (
            process.env.SENDGRID_API_KEY &&
            process.env.SENDGRID_FROM_EMAIL &&
            emailRecipients.length > 0
        ) {
            try {
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                for (const email of emailRecipients) {
                    await sgMail.send({
                        to: email,
                        from: process.env.SENDGRID_FROM_EMAIL,

                        subject: `${alertPrefix} Emergency #${details.emergencyId}`,

                        text: [
                            alertPrefix,
                            '',
                            isAdminEscalation
                                ? 'No counsellors are currently available. Administrator intervention is required.'
                                : 'An emergency alert requires immediate counsellor attention.',
                            '',
                            `Emergency ID: ${details.emergencyId}`,
                            `Severity: ${details.severityScore}`,
                            `Student ID: ${details.studentId}`,
                            `Description: ${details.description}`,
                            `Escalation: ${isAdminEscalation ? 'Admin/Supervisor' : 'Counsellor'}`,
                            `Time: ${new Date().toISOString()}`
                        ].join('\n')
                    });

                    console.log(
                        `[SendGrid] ${alertPrefix} Email sent to ${email}`
                    );

                    emailSent = true;
                }

            } catch (emailErr) {
                console.error(
                    '[SendGrid] Email notification failed:',
                    emailErr.message
                );
            }
        } else {
            console.error(
                '[SendGrid] Skipped: Check SENDGRID_API_KEY, SENDGRID_FROM_EMAIL and email recipient configuration.'
            );
        }

        // ==========================================
        // CHANNEL 2: SMS VIA TWILIO
        // ==========================================

        // SMS is always attempted for high-urgency alerts so counsellors can
        // respond when they are away from their computers.

        if (
            phoneRecipients.length > 0
        ) {
            if (
                process.env.TWILIO_ACCOUNT_SID &&
                process.env.TWILIO_AUTH_TOKEN &&
                process.env.TWILIO_FROM_NUMBER
            ) {
                try {
                    const twilioClient = twilio(
                        process.env.TWILIO_ACCOUNT_SID,
                        process.env.TWILIO_AUTH_TOKEN
                    );

                    const message = [
                        alertPrefix,
                        `Emergency ID: ${details.emergencyId}`,
                        `Severity: ${details.severityScore}`,
                        `Student ID: ${details.studentId}`,
                        `Description: ${details.description}`,
                        isAdminEscalation
                            ? 'No counsellors available. Admin intervention required.'
                            : 'Immediate counsellor attention required.'
                    ].join(' | ');

                    for (const phone of phoneRecipients) {
                        await twilioClient.messages.create({
                            body: message,
                            from: process.env.TWILIO_FROM_NUMBER,
                            to: phone
                        });

                        console.log(
                            `[Twilio] ${alertPrefix} SMS sent to ${phone}`
                        );

                        smsSent = true;
                    }

                } catch (smsErr) {
                    console.error(
                        '[Twilio] SMS notification failed:',
                        smsErr.message
                    );
                }
            } else {
                console.error(
                    '[Twilio] Skipped: Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.'
                );
            }
        }

        // ==========================================
        // NOTIFICATION DELIVERY SUMMARY
        // ==========================================

        if (!emailSent && !smsSent) {
            console.error(
                '[EMERGENCY] Notification delivery failed on all configured channels.'
            );
        }

        console.log(
            `[EMERGENCY DISPATCHED] ID: ${details.emergencyId} | ` +
            `AdminEscalation: ${isAdminEscalation} | ` +
            `Target Count: ${recipients.length} | ` +
            `Email: ${emailSent} | ` +
            `SMS: ${smsSent}`
        );

        return { emailSent, smsSent };

    } catch (err) {
        console.error(
            'Notification dispatch failure across channels:',
            err
        );
        return { emailSent: false, smsSent: false };
    }
}

// =====================================================
// 4. ENVIRONMENT RECIPIENT HELPER
// =====================================================

function getConfiguredRecipients(environmentVariable) {

    return (process.env[environmentVariable] || '')
        .split(',')
        .map(recipient => recipient.trim())
        .filter(Boolean);
}

// =====================================================
// 5. COUNSELLOR EMERGENCY REQUEST MANAGEMENT
// =====================================================

export const getEmergencyRequests = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.id,
                e.student_id,
                u.name AS student_name,
                u.email AS student_email,
                CONCAT('emergency-', e.id) AS room_id,
                CASE e.status
                    WHEN 'Pending_Acknowledgment' THEN 'Pending'
                    ELSE e.status
                END AS status,
                e.created_at
            FROM emergencies e
            JOIN users u ON u.id = e.student_id
            ORDER BY e.created_at DESC
        `);

        return res.json(rows);
    } catch (error) {
        console.error('Get emergency requests error:', error);
        return res.status(500).json({ message: error.message });
    }
};

export const acceptEmergencyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT e.id, e.student_id, u.name AS student_name,
                    u.email AS student_email, e.status
             FROM emergencies e
             JOIN users u ON u.id = e.student_id
             WHERE e.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Emergency request not found.' });
        }

        const request = rows[0];
        if (request.status !== 'Pending_Acknowledgment') {
            return res.status(409).json({
                message: `This request is already ${request.status}.`
            });
        }

        const [result] = await db.query(
            `UPDATE emergencies
             SET status = 'Accepted'
             WHERE id = ? AND status = 'Pending_Acknowledgment'`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                message: 'This request has already been accepted or updated.'
            });
        }

        const roomId = `emergency-${id}`;
        if (global.io) {
            global.io.emit('emergency-call', {
                requestId: Number(id),
                studentId: request.student_id,
                studentName: request.student_name,
                studentEmail: request.student_email,
                roomId
            });
        }

        return res.json({
            success: true,
            roomId,
            requestId: Number(id),
            message: 'Emergency request accepted.'
        });
    } catch (error) {
        console.error('Accept emergency request error:', error);
        return res.status(500).json({ message: error.message });
    }
};

export const completeEmergencyRequest = async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE emergencies
             SET status = 'Completed'
             WHERE id = ? AND status = 'Accepted'`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Accepted emergency request not found.'
            });
        }

        return res.json({ success: true, message: 'Emergency request completed.' });
    } catch (error) {
        console.error('Complete emergency request error:', error);
        return res.status(500).json({ message: error.message });
    }
};

export const cancelEmergencyRequest = async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE emergencies
             SET status = 'Cancelled'
             WHERE id = ? AND status IN ('Pending_Acknowledgment', 'Accepted')`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Active emergency request not found.' });
        }

        return res.json({ success: true, message: 'Emergency request cancelled.' });
    } catch (error) {
        console.error('Cancel emergency request error:', error);
        return res.status(500).json({ message: error.message });
    }
};
