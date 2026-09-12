import PDFDocument from 'pdfkit';
import db from '../config/db.js';

// Get Analytics Data for Admin Dashboard
export const getAnalyticsDashboard = async (req, res) => {
    try {
        // Count students from the existing users table
        const [[{ totalStudents }]] = await db.query(`
            SELECT COUNT(*) AS totalStudents
            FROM users
            WHERE LOWER(role) = 'student'
        `);

        // Count counsellors from the existing users table
        const [[{ totalCounsellors }]] = await db.query(`
            SELECT COUNT(*) AS totalCounsellors
            FROM users
            WHERE LOWER(role) = 'counsellor'
        `);

        /*
         * There are currently no appointments or assessments tables
         * in the database, so these values cannot be calculated yet.
         */
        const totalAppointments = 0;
        const totalAssessments = 0;

        return res.status(200).json({
            success: true,
            stats: {
                totalStudents: Number(totalStudents),
                totalCounsellors: Number(totalCounsellors),
                totalAppointments,
                totalAssessments
            }
        });

    } catch (error) {
        console.error('Analytics aggregation error:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics data.'
        });
    }
};


// Manage Users: Suspend or Change Role with Audit Logging
export const updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { role, is_suspended } = req.body;
    const adminId = req.user?.id;

    try {
        if (
            role &&
            !['student', 'counsellor', 'admin', 'supervisor', 'anonymous'].includes(
                role.toLowerCase()
            )
        ) {
            return res.status(400).json({
                error: 'Invalid role specified.'
            });
        }

        /*
         * NOTE:
         * Your current users table does not contain is_suspended.
         * Therefore we only update the role here.
         */
        if (role) {
            await db.query(
                `UPDATE users SET role = ? WHERE id = ?`,
                [role, userId]
            );
        }

        console.log(
            `[AUDIT] Admin (ID: ${adminId}) updated user ID ${userId}: role=${role}`
        );

        return res.status(200).json({
            success: true,
            message: 'User updated successfully and logged.'
        });

    } catch (error) {
        console.error('User update error:', error);

        return res.status(500).json({
            error: 'Error updating user account.'
        });
    }
};


// Counsellor Verification Workflow
export const verifyCounsellor = async (req, res) => {
    const { counsellorId } = req.params;
    const { verification_status } = req.body;
    const adminId = req.user?.id;

    try {
        /*
         * Your current database does not contain counsellor_profiles.
         * This function therefore cannot update verification status yet.
         */
        console.log(
            `[AUDIT] Admin (ID: ${adminId}) attempted to update counsellor ${counsellorId} to ${verification_status}`
        );

        return res.status(200).json({
            success: true,
            message: 'Counsellor verification will be available when the counsellor profile table is added.'
        });

    } catch (error) {
        console.error('Counsellor verification error:', error);

        return res.status(500).json({
            error: 'Failed to update counsellor workflow.'
        });
    }
};


// Generate Admin Report
export const getAdminReport = async (req, res) => {
    const { format } = req.params;
    const normalizedFormat = String(format || '').toLowerCase();

    if (!['csv', 'pdf'].includes(normalizedFormat)) {
        return res.status(400).json({
            success: false,
            error: 'Unsupported report format.'
        });
    }

    try {
        const [[{ totalStudents }]] = await db.query(`
            SELECT COUNT(*) AS totalStudents
            FROM users
            WHERE LOWER(role) = 'student'
        `);

        const [[{ totalCounsellors }]] = await db.query(`
            SELECT COUNT(*) AS totalCounsellors
            FROM users
            WHERE LOWER(role) = 'counsellor'
        `);

        const totalAppointments = 0;
        const totalAssessments = 0;

        const generatedAt = new Date().toISOString();

        if (normalizedFormat === 'csv') {
            const rows = [
                ['Report Type', 'Value'],
                ['Generated At', generatedAt],
                ['Total Students', totalStudents],
                ['Total Counsellors', totalCounsellors],
                ['Total Appointments', totalAppointments],
                ['Total Assessments', totalAssessments]
            ];

            const csv = rows
                .map((row) =>
                    row
                        .map((value) =>
                            `"${String(value).replace(/"/g, '""')}"`
                        )
                        .join(',')
                )
                .join('\n');

            res.setHeader(
                'Content-Type',
                'text/csv; charset=utf-8'
            );

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="carebridge-admin-report.csv"'
            );

            return res.status(200).send(csv);
        }

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });

        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));

        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);

            res.setHeader(
                'Content-Type',
                'application/pdf'
            );

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="carebridge-admin-report.pdf"'
            );

            return res.status(200).send(pdfBuffer);
        });

        doc.fontSize(22).text(
            'CareBridge Admin Report',
            { align: 'center' }
        );

        doc.moveDown();

        doc.fontSize(12).text(
            `Generated At: ${generatedAt}`
        );

        doc.text(
            `Total Students: ${totalStudents}`
        );

        doc.text(
            `Total Counsellors: ${totalCounsellors}`
        );

        doc.text(
            `Total Appointments: ${totalAppointments}`
        );

        doc.text(
            `Total Assessments: ${totalAssessments}`
        );

        doc.end();

    } catch (error) {
        console.error(
            'Admin report generation error:',
            error
        );

        return res.status(500).json({
            success: false,
            error: 'Failed to generate admin report.'
        });
    }
};