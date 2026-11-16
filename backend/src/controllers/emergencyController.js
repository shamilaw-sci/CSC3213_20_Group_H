
import db from '../config/db.js';
import { assessSeverity, ValidationError } from '../utils/riskAssessment.js';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

// =====================================================
// 1. TRIGGER EMERGENCY
// =====================================================

export const triggerEmergency = async (req, res) => {

    // Verify authentication
    if (!req.user || !req.user.id) {
        return res.status(401).json({
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
                error: error.message
            });
        }

        console.error('Unexpected error assessing emergency severity:', error);

        return res.status(500).json({
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

        // Queue the notification before acknowledging the emergency request.
        await db.query(
            `INSERT INTO emergency_notifications
            (emergency_id, channel, recipient, payload, status)
            VALUES (?, 'email', 'DISPATCH_GROUP', ?, 'PENDING')`,
            [
                emergencyId,
                JSON.stringify({
                    studentId,
                    severityScore,
                    description: normalizedDescription,
                    fallbackTriggered,
                    matchedKeywords
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

        // 3. Offload Socket Alerts and Redundant Notifications asynchronously in the background

        // 3. Offload Socket Alerts and Redundant Notifications asynchronously
        setImmediate(async () => {
            try {
                // 1. Fetch available counsellors
                const [availableCounsellors] = await db.query(`
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

                console.log(
                    `[EMERGENCY] ${availableCounsellors.length} available counsellors found.`
                );

                const noCounsellorsAvailable =
                    availableCounsellors.length === 0;

                // 2. Escalate to administrators if no counsellors are available
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

                // 3. Broadcast the normal emergency alert to counsellors
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

        const sendSmsRedundantly =
            process.env.TWILIO_REDUNDANT_ESCALATION === 'true';

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

        // SMS is attempted when:
        // 1. Email failed, OR
        // 2. Redundant SMS is enabled, OR
        // 3. Admin escalation is active.

        if (
            phoneRecipients.length > 0 &&
            (!emailSent || sendSmsRedundantly || isAdminEscalation)
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
