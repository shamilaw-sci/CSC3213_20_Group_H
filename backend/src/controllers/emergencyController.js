import db from '../config/db.js';
import { assessSeverity, ValidationError } from '../utils/riskAssessment.js';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

export const triggerEmergency = async (req, res) => {
    // 1. Verify authentication
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

    // 2. Assess emergency severity
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
            return res.status(400).json({ error: error.message });
        }

        console.error('Unexpected error assessing emergency severity:', error);

        return res.status(500).json({
            error: 'Critical system error processing emergency request.'
        });
    }

    // 3. Save emergency and immediately acknowledge the student
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

        // 4. Immediately acknowledge the emergency request
        res.status(201).json({
            success: true,
            message: 'Help request received. Emergency protocols activated. An active responder has been notified.',
            emergencyId,
            severity: severityScore
        });

        // 5. Run notifications asynchronously in the background
        setImmediate(async () => {
            try {
                // Broadcast real-time alert to counsellors
                if (global.io) {
                    global.io.to('counsellors-room').emit('emergencyAlert', {
                        emergencyId,
                        studentId,
                        severityScore,
                        fallbackTriggered,
                        description: normalizedDescription,
                        timestamp: new Date().toISOString()
                    });
                }

                // Trigger redundant notifications
                await dispatchRedundantNotifications({
                    emergencyId,
                    studentId,
                    severityScore,
                    fallbackTriggered,
                    matchedKeywords,
                    description: normalizedDescription ||
                        'Immediate crisis assistance requested'
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

async function dispatchRedundantNotifications(details) {
    const emailRecipients = getConfiguredRecipients('ON_CALL_COUNSELLOR_EMAILS');
    const phoneRecipients = getConfiguredRecipients('ON_CALL_COUNSELLOR_PHONES');
    const sendSmsRedundantly = process.env.TWILIO_REDUNDANT_ESCALATION === 'true';
    let emailSent = false;
    let smsSent = false;

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL && emailRecipients.length) {
        try {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            await sgMail.send({
                to: emailRecipients,
                from: process.env.SENDGRID_FROM_EMAIL,
                subject: `URGENT CareBridge emergency alert #${details.emergencyId}`,
                text: [
                    'An emergency alert requires immediate counsellor attention.',
                    `Emergency ID: ${details.emergencyId}`,
                    `Severity: ${details.severityScore}`,
                    `Student ID: ${details.studentId}`,
                    `Description: ${details.description}`,
                    `Time: ${new Date().toISOString()}`,
                ].join('\n'),
            });
            emailSent = true;
        } catch (error) {
            console.error('SendGrid notification failed:', error.message);
        }
    } else {
        console.error(
            'SendGrid notification skipped: configure SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, and ON_CALL_COUNSELLOR_EMAILS.'
        );
    }

    if ((!emailSent || sendSmsRedundantly) && phoneRecipients.length) {
        if (
            process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_FROM_NUMBER
        ) {
            try {
                const client = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                const message = [
                    'URGENT CareBridge emergency alert',
                    `ID: ${details.emergencyId}`,
                    `Severity: ${details.severityScore}`,
                    `Description: ${details.description}`,
                ].join(' | ');

                await Promise.all(
                    phoneRecipients.map((to) =>
                        client.messages.create({
                            body: message,
                            from: process.env.TWILIO_FROM_NUMBER,
                            to,
                        })
                    )
                );
                smsSent = true;
            } catch (error) {
                console.error('Twilio notification failed:', error.message);
            }
        } else {
            console.error(
                'Twilio notification skipped: configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.'
            );
        }
    }

    if (!emailSent && !smsSent) {
        console.error('Emergency notification delivery failed on all configured channels.');
    }

    const riskFlags = details.matchedKeywords?.length ? details.matchedKeywords.join(', ') : 'none';
    console.log(`[EMERGENCY DISPATCHED] ID: ${details.emergencyId} | Severity: ${details.severityScore} | Fallback: ${details.fallbackTriggered} | RiskFlags: ${riskFlags} | Email: ${emailSent} | SMS: ${smsSent}`);
}

function getConfiguredRecipients(environmentVariable) {
    return (process.env[environmentVariable] || '')
        .split(',')
        .map((recipient) => recipient.trim())
        .filter(Boolean);
}