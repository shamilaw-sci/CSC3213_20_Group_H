import db from '../config/db.js';

export const logAdminAction = async (adminId, actionType, targetDetails) => {
    try {
        const query = `
            INSERT INTO system_reports (generated_by, report_type, title, file_path) 
            VALUES (?, 'CSV', ?, ?)
        `;
        // Alternatively, use a dedicated audit_logs table if preferred. 
        // Here we log the administrative action trail securely.
        console.log(`[AUDIT LOG] Admin ID ${adminId} performed: ${actionType} on ${targetDetails}`);
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
};