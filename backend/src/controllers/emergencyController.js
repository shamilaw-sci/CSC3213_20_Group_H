
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

        // Immediately acknowledge the student
        res.status(201).json({
            success: true,
            message: 'Help request received. Emergency protocols activated. An active responder has been notified.',
            emergencyId,
            severity: severityScore
        });

        // =====================================================
        // 2. BACKGROUND EMERGENCY NOTIFICATIONS
        // =====================================================

        // 3. Offload Socket Alerts and Redundant Notifications asynchronously in the background
        setImmediate(async () => {
            try {
                // Fetch available counsellors along with their database phone numbers and emails
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

                // Broadcast real-time alert through Socket.IO
                if (global.io) {
                    global.io.to('counsellors-room').emit('emergencyAlert', {
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
                    });
                }

                // Dispatch email and SMS notifications using database records
                await dispatchRedundantNotifications({
                    emergencyId,
                    studentId,
                    severityScore,
                    fallbackTriggered,
                    matchedKeywords,
                    description: normalizedDescription ||
                        'Immediate crisis assistance requested',
                    recipients: availableCounsellors
                });

            } catch (bgError) {
                console.error(
                    'Background emergency notification error:',
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


async function dispatchRedundantNotifications(details) {
    try {
        let emailSent = false;
        let smsSent = false;

        const recipients = details.recipients || [];

        // Get email addresses from available counsellors.
        // Fall back to configured recipients if none are available.
        const databaseEmailRecipients = recipients
            .map(counsellor => counsellor.email)
            .filter(Boolean);

        const emailRecipients = databaseEmailRecipients.length
            ? databaseEmailRecipients
            : getConfiguredRecipients('ON_CALL_COUNSELLOR_EMAILS');

        // Get phone numbers from available counsellors.
        // Fall back to configured recipients if none are available.
        const databasePhoneRecipients = recipients
            .map(counsellor => counsellor.phone)
            .filter(Boolean);

        const phoneRecipients = databasePhoneRecipients.length
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

                // Send an individual email to each recipient.
                for (const email of emailRecipients) {
                    await sgMail.send({
                        to: email,
                        from: process.env.SENDGRID_FROM_EMAIL,
                        subject: `URGENT CareBridge emergency alert #${details.emergencyId}`,
                        text: [
                            'An emergency alert requires immediate counsellor attention.',
                            `Emergency ID: ${details.emergencyId}`,
                            `Severity: ${details.severityScore}`,
                            `Student ID: ${details.studentId}`,
                            `Description: ${details.description}`,
                            `Time: ${new Date().toISOString()}`
                        ].join('\n')
                    });

                    console.log(
                        `[SendGrid] Emergency ${details.emergencyId} email sent to ${email}`
                    );
                }

                emailSent = true;

            } catch (emailErr) {
                console.error(
                    '[SendGrid] Email notification failed:',
                    emailErr.message
                );
            }
        } else {
            console.error(
                '[SendGrid] Skipped: Check SENDGRID_API_KEY, SENDGRID_FROM_EMAIL and recipient configuration.'
            );
        }

        // ==========================================
        // CHANNEL 2: SMS VIA TWILIO
        // ==========================================

        // Send SMS if email failed OR redundant SMS is enabled.
        if (
            (!emailSent || sendSmsRedundantly) &&
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
                        'URGENT CareBridge emergency alert',
                        `Emergency ID: ${details.emergencyId}`,
                        `Severity: ${details.severityScore}`,
                        `Description: ${details.description}`
                    ].join(' | ');

                    for (const phone of phoneRecipients) {
                        await twilioClient.messages.create({
                            body: message,
                            from: process.env.TWILIO_FROM_NUMBER,
                            to: phone
                        });

                        console.log(
                            `[Twilio] Emergency ${details.emergencyId} SMS sent to ${phone}`
                        );
                    }

                    smsSent = true;

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

        const riskFlags = details.matchedKeywords?.length
            ? details.matchedKeywords.join(', ')
            : 'none';

        console.log(
            `[EMERGENCY DISPATCHED] ID: ${details.emergencyId} | ` +
            `Severity: ${details.severityScore} | ` +
            `Fallback: ${details.fallbackTriggered} | ` +
            `RiskFlags: ${riskFlags} | ` +
            `Target Count: ${recipients.length} | ` +
            `Email: ${emailSent} | ` +
            `SMS: ${smsSent}`
        );

    } catch (err) {
        console.error(
            'Notification dispatch failure across channels:',
            err
        );
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
