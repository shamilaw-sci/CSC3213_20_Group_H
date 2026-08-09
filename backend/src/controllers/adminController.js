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

        const [[{ totalStudents }]] = await db.query(`SELECT COUNT(*) as totalStudents FROM users WHERE role='student'`);
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

// Manage Users: Suspend or Change Role
export const updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { role, is_suspended } = req.body;
    try {
        await db.query(
            `UPDATE users SET role = COALESCE(?, role), is_suspended = COALESCE(?, is_suspended) WHERE id = ?`,
            [role, is_suspended, userId]
        );
        return res.status(200).json({ success: true, message: 'User updated successfully.' });
    } catch (error) {
        return res.status(500).json({ error: 'Error updating user account.' });
    }
};

// Counsellor Verification Workflow
export const verifyCounsellor = async (req, res) => {
    const { counsellorId } = req.params;
    const { verification_status } = req.body; 
    try {
        await db.query(
            `UPDATE counsellor_profiles SET verification_status = ? WHERE id = ?`,
            [verification_status, counsellorId]
        );
        return res.status(200).json({ success: true, message: `Counsellor status updated to ${verification_status}` });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update counsellor workflow.' });
    }
};