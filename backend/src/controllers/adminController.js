import PDFDocument from 'pdfkit';
import db from '../config/db.js';

const buildAdminReportData = async () => {
    const [[{ totalStudents }]] = await db.query(`SELECT COUNT(*) as totalStudents FROM users WHERE role IN ('student', 'anonymous')`);
    const [[{ totalCounsellors }]] = await db.query(`SELECT COUNT(*) as totalCounsellors FROM users WHERE role='counsellor'`);
    const [[{ activeEmergencies }]] = await db.query(`SELECT COUNT(*) as activeEmergencies FROM emergencies WHERE status != 'Resolved'`);
    const [severityStats] = await db.query(
        `SELECT severity_score, COUNT(*) as count FROM emergencies GROUP BY severity_score ORDER BY severity_score ASC`
    );

    return {
        totalStudents,
        totalCounsellors,
        activeEmergencies,
        severityStats,
        generatedAt: new Date().toISOString()
    };
};

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
        const [students] = await db.query(
            `SELECT id, name, email, role, is_suspended
             FROM users
             WHERE role IN ('student', 'anonymous')
             ORDER BY created_at DESC`
        );
        const [counsellors] = await db.query(
            `SELECT c.id, c.name, u.email, c.specialization AS department,
                    COALESCE(cp.verification_status, 'pending') AS verification_status
             FROM counsellors c
             LEFT JOIN users u ON u.id = c.user_id
             LEFT JOIN counsellor_profiles cp ON cp.user_id = c.user_id
             ORDER BY c.created_at DESC`
        );

        return res.status(200).json({
            success: true,
            stats: { totalStudents, totalCounsellors, activeEmergencies },
            charts: { severityStats, sessionStats },
            students: students.map((student) => ({
                ...student,
                type: student.role === 'anonymous' ? 'anonymous' : 'registered',
                status: student.is_suspended ? 'Suspended' : 'Active'
            })),
            counsellors
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

        global.io?.to('admin-room').emit('usersUpdated');

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

        global.io?.to('admin-room').emit('usersUpdated');

        // NF-SEC-1.6 Audit trail logging
        console.log(`[AUDIT] Admin (ID: ${adminId}) changed counsellor profile ${counsellorId} status to ${verification_status}`);

        return res.status(200).json({ success: true, message: `Counsellor status updated to ${verification_status}` });
    } catch (error) {
        console.error('Counsellor verification error:', error);
        return res.status(500).json({ error: 'Failed to update counsellor workflow.' });
    }
};

export const getAdminReport = async (req, res) => {
    const { format } = req.params;
    const normalizedFormat = String(format || '').toLowerCase();

    if (!['csv', 'pdf'].includes(normalizedFormat)) {
        return res.status(400).json({ success: false, error: 'Unsupported report format.' });
    }

    try {
        const [[{ totalStudents }]] = await db.query(`SELECT COUNT(*) as totalStudents FROM users WHERE role IN ('student', 'anonymous')`);
        const [[{ totalCounsellors }]] = await db.query(`SELECT COUNT(*) as totalCounsellors FROM users WHERE role='counsellor'`);
        const [[{ activeEmergencies }]] = await db.query(`SELECT COUNT(*) as activeEmergencies FROM emergencies WHERE status != 'Resolved'`);
        const [severityStats] = await db.query(
            `SELECT severity_score, COUNT(*) as count FROM emergencies GROUP BY severity_score ORDER BY severity_score ASC`
        );

        const generatedAt = new Date().toISOString();

        if (normalizedFormat === 'csv') {
            const rows = [
                ['Report Type', 'Value'],
                ['Generated At', generatedAt],
                ['Total Students & Anonymous', totalStudents],
                ['Active Counsellors', totalCounsellors],
                ['Pending Crisis Alerts', activeEmergencies],
                ['Severity Summary', '']
            ];

            severityStats.forEach((entry) => {
                rows.push(['Severity Score', `${entry.severity_score}:${entry.count}`]);
            });

            const csv = rows
                .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="carebridge-admin-report.csv"');
            return res.status(200).send(csv);
        }

        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="carebridge-admin-report.pdf"');
            return res.status(200).send(pdfBuffer);
        });

        doc.fontSize(22).text('CareBridge Admin Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated At: ${generatedAt}`);
        doc.text(`Total Students & Anonymous: ${totalStudents}`);
        doc.text(`Active Counsellors: ${totalCounsellors}`);
        doc.text(`Pending Crisis Alerts: ${activeEmergencies}`);
        doc.moveDown();
        doc.fontSize(14).text('Severity Summary');

        if (severityStats.length === 0) {
            doc.text('No emergency severity data available.');
        } else {
            severityStats.forEach((entry) => {
                doc.text(`Severity ${entry.severity_score}: ${entry.count} incidents`);
            });
        }

        doc.end();
    } catch (error) {
        console.error('Admin report generation error:', error);
        return res.status(500).json({ success: false, error: 'Failed to generate admin report.' });
    }
};