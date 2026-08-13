import db from '../config/db.js';

// Get Analytics Data for Admin Dashboard Charts
export const getAnalyticsDashboard = async (req, res) => {
    try {
        const [severityStats] = await db.query(
            `SELECT severity_score, COUNT(*) as count FROM emergencies GROUP BY severity_score`
        );

        const [sessionStats] = await db.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count FROM emergencies GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7`
        );

        const [[{ totalStudents }]] = await db.query(`SELECT COUNT(*) as totalStudents FROM users WHERE role IN ('student', 'anonymous')`);
        const [[{ totalCounsellors }]] = await db.query(`SELECT COUNT(*) as totalCounsellors FROM users WHERE role='counsellor'`);
        const [[{ activeEmergencies }]] = await db.query(`SELECT COUNT(*) as activeEmergencies FROM emergencies WHERE status != 'Resolved'`);

        return res.status(200).json({
            success: true,
            stats: { totalStudents, totalCounsellors, activeEmergencies },
            charts: { severityStats, sessionStats }
        });
    } catch (error) {
        console.error('Analytics aggregation error:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics data.' });
    }
};

// Manage Users: Suspend or Change Role with Audit Logging
export const updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { role, is_suspended } = req.body;
    const adminId = req.user?.id; // Extracted from verified JWT token

    try {
        // Validate role includes anonymous option if passed
        if (role && !['student', 'counsellor', 'admin', 'supervisor', 'anonymous'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        await db.query(
            `UPDATE users SET role = COALESCE(?, role), is_suspended = COALESCE(?, is_suspended) WHERE id = ?`,
            [role, is_suspended, userId]
        );

        // NF-SEC-1.6 Audit trail logging
        console.log(`[AUDIT] Admin (ID: ${adminId}) updated user ID ${userId}: role=${role}, suspended=${is_suspended}`);

        return res.status(200).json({ success: true, message: 'User updated successfully and logged.' });
    } catch (error) {
        console.error('User update error:', error);
        return res.status(500).json({ error: 'Error updating user account.' });
    }
};

// Counsellor Verification Workflow with Audit Logging
export const verifyCounsellor = async (req, res) => {
    const { counsellorId } = req.params;
    const { verification_status } = req.body; 
    const adminId = req.user?.id;

    try {
        await db.query(
            `UPDATE counsellor_profiles SET verification_status = ? WHERE id = ?`,
            [verification_status, counsellorId]
        );

        // NF-SEC-1.6 Audit trail logging
        console.log(`[AUDIT] Admin (ID: ${adminId}) changed counsellor profile ${counsellorId} status to ${verification_status}`);

        return res.status(200).json({ success: true, message: `Counsellor status updated to ${verification_status}` });
    } catch (error) {
        console.error('Counsellor verification error:', error);
        return res.status(500).json({ error: 'Failed to update counsellor workflow.' });
    }
};