// ============================================================================
// src/models/Notification.js - Notification Data Access Layer
// يتعامل مع جداول notifications و notification_preferences
// ============================================================================

const { query, queryOne } = require('../config/database');

// =======================================================
// 1. دوال الإشعارات (Notifications)
// =======================================================

/**
 * دالة لإنشاء إشعار جديد (تُستخدم بواسطة الـ Services والـ Controllers الأخرى)
 */
exports.create = async (userId, title, message, type, link = null) => {
    const sql = `
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [userId, title, message, type, link]);
    return result.insertId;
};

/**
 * جلب إشعارات المستخدم مع الفلترة والتقسيم (Pagination)
 */
exports.findByUser = async (userId, filters) => {
    const { page = 1, limit = 20, type, isRead } = filters;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }
    
    // isRead يمكن أن تكون 'true' أو 'false' من الـ Query
    if (isRead !== undefined && (isRead === 'true' || isRead === 'false')) {
        sql += ' AND is_read = ?';
        // نحول القيمة النصية إلى قيمة منطقية (Boolean)
        params.push(isRead === 'true'); 
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const notifications = await query(sql, params);

    // جلب العدد الكلي للصفحات (ضروري للـ Pagination)
    const countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countResult = await queryOne(countSql, [userId]);
    const total = countResult.total || 0;
    
    return { 
        data: notifications, 
        total, 
        totalPages: Math.ceil(total / limit) 
    };
};

/**
 * جلب عدد الإشعارات غير المقروءة للمستخدم
 */
exports.getUnreadCount = async (userId) => {
    const result = await queryOne('SELECT COUNT(id) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);
    return result ? result.count : 0;
};

/**
 * وسم إشعار واحد كمقروء
 */
exports.markAsRead = async (notificationId, userId) => {
    const sql = 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ? AND is_read = FALSE';
    const result = await query(sql, [notificationId, userId]);
    return result.affectedRows > 0;
};

/**
 * وسم جميع إشعارات المستخدم كـ "مقروءة"
 */
exports.markAllAsRead = async (userId) => {
    const sql = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';
    const result = await query(sql, [userId]);
    return result.affectedRows;
};

/**
 * حذف إشعار واحد
 */
exports.delete = async (notificationId, userId) => {
    const sql = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
    const result = await query(sql, [notificationId, userId]);
    return result.affectedRows > 0;
};

/**
 * حذف جميع الإشعارات المقروءة للمستخدم
 */
exports.deleteAllRead = async (userId) => {
    const sql = 'DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE';
    const result = await query(sql, [userId]);
    return result.affectedRows;
};

// =======================================================
// 2. دوال تفضيلات الإشعارات (Preferences)
// =======================================================

/**
 * جلب تفضيلات إشعارات المستخدم
 */
exports.getPreferences = async (userId) => {
    // يمكننا استخدام OR INSERT هنا، لكن سنستخدم منطق الـ Controller الأصلي (Select ثم Insert/Update)
    const sql = 'SELECT * FROM notification_preferences WHERE user_id = ?';
    return await queryOne(sql, [userId]);
};

/**
 * تحديث أو إنشاء تفضيلات إشعارات المستخدم
 */
exports.upsertPreferences = async (userId, prefs) => {
    const { 
        email_notifications, 
        in_app_notifications, 
        course_updates, 
        assignment_reminders, 
        message_notifications 
    } = prefs;

    // حاول البحث أولاً
    const existingPrefs = await this.getPreferences(userId);

    if (existingPrefs) {
        // تحديث إذا وجدت
        const updateSql = `
            UPDATE notification_preferences 
            SET email_notifications = ?, in_app_notifications = ?, course_updates = ?,
                assignment_reminders = ?, message_notifications = ?
            WHERE user_id = ?
        `;
        await query(updateSql, [
            email_notifications, in_app_notifications, course_updates,
            assignment_reminders, message_notifications, userId
        ]);
        return 'updated';
    } else {
        // إنشاء إذا لم توجد
        const insertSql = `
            INSERT INTO notification_preferences 
            (user_id, email_notifications, in_app_notifications, course_updates, assignment_reminders, message_notifications)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await query(insertSql, [
            userId, email_notifications, in_app_notifications, course_updates,
            assignment_reminders, message_notifications
        ]);
        return 'created';
    }
};