// ============================================================================
// src/services/adminService.js - Admin Business Logic Layer
// ============================================================================

const UserModel = require('../models/User');
const NotificationModel = require('../models/Notification');
const { query } = require('../config/database'); 
const ApiError = require('../middleware/errorHandler').ApiError;
const bcrypt = require('bcryptjs');

// =======================================================
// 1. دوال لوحة التحكم والإحصائيات
// =======================================================

/**
 * جلب إحصائيات لوحة تحكم المشرف (Admin)
 */
exports.getDashboardStats = async () => {
    // *نعتمد على دالة شاملة في UserModel أو استعلامات منفصلة في الموديلات الأخرى*
    // لتبسيط الأمر، سنقوم بتنفيذ الاستعلامات الأساسية هنا مؤقتاً (كما في adminController.js الأصلي)
    
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    const activeStudents = await query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = TRUE");
    const activeInstructors = await query("SELECT COUNT(*) as count FROM users WHERE role = 'instructor' AND is_active = TRUE");
    const totalCourses = await query('SELECT COUNT(*) as count FROM courses');
    const pendingProjects = await query("SELECT COUNT(*) as count FROM projects WHERE status = 'submitted'");

    return {
        totalUsers: totalUsers[0].count,
        activeStudents: activeStudents[0].count,
        activeInstructors: activeInstructors[0].count,
        totalCourses: totalCourses[0].count,
        pendingProjects: pendingProjects[0].count,
        // يمكن إضافة المزيد من الإحصائيات هنا (مثل إجمالي الإيرادات، المشاريع المكتملة)
    };
};

// =======================================================
// 2. دوال إدارة المستخدمين
// =======================================================

/**
 * جلب جميع المستخدمين مع الفلترة والتقسيم
 */
exports.getAllUsers = async (filters) => {
    // *افتراض: وجود دالة findAll في UserModel لدعم الفلترة*
    return await UserModel.findAll(filters); 
};

/**
 * جلب مستخدم واحد حسب المُعرف
 */
exports.getUserById = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found.');
    }
    return user;
};

/**
 * تحديث بيانات المستخدم بواسطة المشرف
 */
exports.updateUser = async (userId, userData) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found.');
    }

    // إذا تم تمرير كلمة مرور، قم بتشفيرها
    if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    // *افتراض: وجود دالة updateByAdmin في UserModel*
    await UserModel.updateByAdmin(userId, userData);
    
    // إشعار المستخدم
    await NotificationModel.create(
        userId, 
        'Account Updated', 
        'Your account information has been updated by an administrator.', 
        'account'
    );
    
    return true;
};

/**
 * تفعيل/تعطيل حالة المستخدم
 */
exports.toggleUserStatus = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found.');
    }

    const newStatus = !user.is_active;
    await UserModel.updateStatus(userId, newStatus); // *افتراض: وجود دالة updateStatus في UserModel*
    
    // إشعار المستخدم
    const statusMessage = newStatus ? 'activated' : 'deactivated';
    await NotificationModel.create(
        userId, 
        'Account Status Changed', 
        `Your account has been ${statusMessage} by an administrator.`, 
        'account'
    );
    
    return newStatus;
};

/**
 * حذف مستخدم
 */
exports.deleteUser = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found.');
    }
    
    // *افتراض: وجود دالة deleteUser في UserModel*
    await UserModel.deleteUser(userId);
    
    return true;
};

// =======================================================
// 3. دوال التقارير (Reports)
// =======================================================

/**
 * إنشاء تقارير إحصائية
 */
exports.generateReport = async (reportType, startDate, endDate) => {
    let reportData = [];
    let sql;

    switch (reportType) {
        case 'user-registrations':
            sql = `
                SELECT DATE(created_at) as date, role, COUNT(*) as count 
                FROM users 
                WHERE created_at BETWEEN ? AND ?
                GROUP BY DATE(created_at), role
            `;
            reportData = await query(sql, [startDate, endDate]);
            break;
            
        case 'course-enrollment':
            sql = `
                SELECT c.title, COUNT(e.id) as enrollments
                FROM courses c
                LEFT JOIN enrollments e ON c.id = e.course_id
                WHERE e.enrolled_at BETWEEN ? AND ?
                GROUP BY c.id
            `;
            reportData = await query(sql, [startDate, endDate]);
            break;

        case 'project-completion':
            sql = `
                SELECT DATE(completed_at) as date, COUNT(*) as completed
                FROM projects
                WHERE completed_at BETWEEN ? AND ? AND status = 'completed'
                GROUP BY DATE(completed_at)
            `;
            reportData = await query(sql, [startDate, endDate]);
            break;
            
        case 'system-settings':
            // جلب إعدادات النظام
            sql = 'SELECT setting_key, setting_value, description FROM system_settings';
            reportData = await query(sql);
            break;
            
        default:
            throw new ApiError(400, `Invalid report type: ${reportType}`);
    }

    return {
        reportType,
        period: { startDate, endDate },
        data: reportData
    };
};