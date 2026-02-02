const { query, queryOne } = require('../config/database');

// Get all notifications for current user
exports.getNotifications = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { page = 1, limit = 20, type, isRead } = req.query;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [user_id];

        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }

        if (isRead !== undefined) {
            sql += ' AND is_read = ?';
            params.push(isRead === 'true');
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const notifications = await query(sql, params);

        // Get total count
        const countResult = await queryOne(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
            [user_id]
        );

        res.json({
            success: true,
            data: notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await queryOne(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [user_id]
        );

        res.json({
            success: true,
            data: { unreadCount: result.count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error.message
        });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const user_id = req.user.id;

        const notification = await queryOne(
            'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, user_id]
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [notificationId]
        );

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const user_id = req.user.id;

        await query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [user_id]
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const user_id = req.user.id;

        const notification = await queryOne(
            'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, user_id]
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await query('DELETE FROM notifications WHERE id = ?', [notificationId]);

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
};

// Delete all read notifications
exports.deleteAllRead = async (req, res) => {
    try {
        const user_id = req.user.id;

        await query(
            'DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE',
            [user_id]
        );

        res.json({
            success: true,
            message: 'All read notifications deleted successfully'
        });
    } catch (error) {
        console.error('Delete all read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notifications',
            error: error.message
        });
    }
};

// Get notification preferences
exports.getPreferences = async (req, res) => {
    try {
        const user_id = req.user.id;

        let preferences = await queryOne(
            'SELECT * FROM notification_preferences WHERE user_id = ?',
            [user_id]
        );

        if (!preferences) {
            // Create default preferences
            await query(
                'INSERT INTO notification_preferences (user_id) VALUES (?)',
                [user_id]
            );
            preferences = await queryOne(
                'SELECT * FROM notification_preferences WHERE user_id = ?',
                [user_id]
            );
        }

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch preferences',
            error: error.message
        });
    }
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
    try {
        const user_id = req.user.id;
        const {
            email_notifications,
            in_app_notifications,
            course_updates,
            assignment_reminders,
            message_notifications
        } = req.body;

        // Check if preferences exist
        const exists = await queryOne(
            'SELECT id FROM notification_preferences WHERE user_id = ?',
            [user_id]
        );

        if (!exists) {
            // Create new
            await query(
                `INSERT INTO notification_preferences 
                 (user_id, email_notifications, in_app_notifications, course_updates, 
                  assignment_reminders, message_notifications)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [user_id, email_notifications, in_app_notifications, course_updates,
                 assignment_reminders, message_notifications]
            );
        } else {
            // Update existing
            await query(
                `UPDATE notification_preferences 
                 SET email_notifications = ?, in_app_notifications = ?, course_updates = ?,
                     assignment_reminders = ?, message_notifications = ?
                 WHERE user_id = ?`,
                [email_notifications, in_app_notifications, course_updates,
                 assignment_reminders, message_notifications, user_id]
            );
        }

        res.json({
            success: true,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: error.message
        });
    }
};

// Create notification (internal function, can be called by other controllers)
exports.createNotification = async (userId, title, message, type, link = null) => {
    try {
        await query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, title, message, type, link]
        );
        return true;
    } catch (error) {
        console.error('Create notification error:', error);
        return false;
    }
};