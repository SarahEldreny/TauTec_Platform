// ============================================================================
// src/services/notificationService.js - Notification Business Logic Layer
// ============================================================================

const NotificationModel = require('../models/Notification');
const ApiError = require('../middleware/errorHandler').ApiError;

// =======================================================
// 1. دوال جلب الإشعارات
// =======================================================

/**
 * جلب إشعارات المستخدم مع الفلترة والتقسيم
 */
exports.getUserNotifications = async (userId, filters) => {
    return await NotificationModel.findByUser(userId, filters);
};

/**
 * جلب عدد الإشعارات غير المقروءة
 */
exports.getUnreadCount = async (userId) => {
    return await NotificationModel.getUnreadCount(userId);
};

// =======================================================
// 2. دوال إدارة حالة الإشعارات
// =======================================================

/**
 * وسم إشعار واحد كمقروء (بعد التحقق من الملكية)
 */
exports.markAsRead = async (notificationId, userId) => {
    const success = await NotificationModel.markAsRead(notificationId, userId);
    
    if (!success) {
        throw new ApiError(404, 'Notification not found or access denied.');
    }
    
    return true;
};

/**
 * وسم جميع إشعارات المستخدم كـ "مقروءة"
 */
exports.markAllAsRead = async (userId) => {
    const affectedCount = await NotificationModel.markAllAsRead(userId);
    return { count: affectedCount };
};

/**
 * حذف إشعار واحد (بعد التحقق من الملكية)
 */
exports.deleteNotification = async (notificationId, userId) => {
    const success = await NotificationModel.delete(notificationId, userId);
    
    if (!success) {
        throw new ApiError(404, 'Notification not found or access denied.');
    }
    
    return true;
};

/**
 * حذف جميع الإشعارات المقروءة للمستخدم
 */
exports.deleteAllRead = async (userId) => {
    const affectedCount = await NotificationModel.deleteAllRead(userId);
    return { count: affectedCount };
};

// =======================================================
// 3. دوال تفضيلات الإشعارات (Preferences)
// =======================================================

/**
 * جلب تفضيلات إشعارات المستخدم
 */
exports.getPreferences = async (userId) => {
    return await NotificationModel.getPreferences(userId);
};

/**
 * تحديث تفضيلات إشعارات المستخدم
 */
exports.updatePreferences = async (userId, prefs) => {
    // يمكن إضافة تحقق من صحة البيانات هنا
    const result = await NotificationModel.upsertPreferences(userId, prefs);
    return result;
};