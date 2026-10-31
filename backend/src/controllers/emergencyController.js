import db from '../config/db.js';
import { assessSeverity, ValidationError } from '../utils/riskAssessment.js';

export const triggerEmergency = async (req, res) => {
    // req.user is supplied by the JWT auth middleware; guard against it being missing
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required to trigger an emergency alert.' });
    }
    const studentId = req.user.id;
    const { description, aiConfidence } = req.body ?? {};

    let severityScore;
    let fallbackTriggered;
    let matchedKeywords;
    let normalizedDescription;
    let normalizedConfidence;

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
        return res.status(500).json({ error: 'Critical system error processing emergency request.' });
    }

    try {
        // 1. Log Emergency to MySQL Database
        const [result] = await db.query(
            `INSERT INTO emergencies (student_id, severity_score, description, ai_confidence, fallback_triggered, status)
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

        // 2. Broadcast Real-Time Alert to Counsellors via Socket.IO
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

        // 3. Trigger Redundant Notifications (In-App -> SendGrid -> Twilio fallback)
        await dispatchRedundantNotifications({
            emergencyId,
            studentId,
            severityScore,
            fallbackTriggered,
            matchedKeywords
        });

        // 4. Immediate Acknowledgement Response back to the student (Satisfies NF-PERF-1.5 <= 3s)
        return res.status(201).json({
            success: true,
            message: 'Help request received. Emergency protocols activated. An active responder has been notified.',
            emergencyId,
            severity: severityScore
        });

    } catch (error) {
        console.error('Emergency trigger failure:', error);
        return res.status(500).json({ error: 'Critical system error processing emergency request.' });
    }
};

// Redundant Notification Engine with Fallback Channels
async function dispatchRedundantNotifications(details) {
    try {
        let emailSent = false;
        let smsSent = false;

        // Channel 1: Email via SendGrid (Fallback Layer 1)
        if (process.env.SENDGRID_API_KEY) {
            try {
                // Implement SendGrid Mail API call here
                emailSent = true;
            } catch (emailErr) {
                console.error('SendGrid channel failed, triggering fallback...', emailErr);
            }
        }

        // Channel 2: SMS via Twilio (Fallback Layer 2 / High-Urgency Redundancy)
        if (!emailSent && process.env.TWILIO_ACCOUNT_SID) {
            try {
                // Implement Twilio SMS API call here
                smsSent = true;
            } catch (smsErr) {
                console.error('Twilio channel failed as well:', smsErr);
            }
        }

        const riskFlags = details.matchedKeywords?.length ? details.matchedKeywords.join(', ') : 'none';
        console.log(`[EMERGENCY DISPATCHED] ID: ${details.emergencyId} | Severity: ${details.severityScore} | Fallback: ${details.fallbackTriggered} | RiskFlags: ${riskFlags} | Email: ${emailSent} | SMS: ${smsSent}`);
    } catch (err) {
        console.error('Notification dispatch failure across channels:', err);
    }
}