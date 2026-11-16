import db from "../config/db.js";

export const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const role = String(req.user.role || "").toLowerCase();

  try {
    let query;
    let params;

    if (["admin", "supervisor"].includes(role)) {
      query = `
        SELECT n.*, u.name AS patient_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.patient_id
        WHERE n.user_id = ? OR n.recipient_role IN ('admin', 'supervisor', 'counsellor')
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT 60
      `;
      params = [userId];
    } else if (role === "counsellor") {
      query = `
        SELECT n.*, u.name AS patient_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.patient_id
        WHERE n.user_id = ? OR (n.recipient_role = 'counsellor' AND n.user_id IS NULL)
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT 60
      `;
      params = [userId];
    } else {
      query = `
        SELECT *
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 40
      `;
      params = [userId];
    }

    const [rows] = await db.query(query, params);
    const unreadCount = rows.filter((r) => !r.is_read).length;

    return res.status(200).json({ notifications: rows, unreadCount });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return res.status(500).json({ error: "Could not load notifications." });
  }
};

export const markNotificationRead = async (req, res) => {
  const notificationId = Number(req.params.id);
  const userId = req.user.id;
  const role = String(req.user.role || "").toLowerCase();

  try {
    const [rows] = await db.query(`SELECT * FROM notifications WHERE id = ?`, [notificationId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Notification not found." });
    }

    const notif = rows[0];
    const isStaff = ["admin", "supervisor", "counsellor"].includes(role);
    if (notif.user_id && Number(notif.user_id) !== Number(userId) && !isStaff) {
      return res.status(403).json({ error: "Forbidden." });
    }

    await db.query(`UPDATE notifications SET is_read = TRUE WHERE id = ?`, [notificationId]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return res.status(500).json({ error: "Could not update notification." });
  }
};
