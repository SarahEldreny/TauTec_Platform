// ============================================================================
// src/services/instructorService.js - Instructor Business Logic Layer
// ============================================================================

const CourseModel = require('../models/Course');
const EnrollmentModel = require('../models/Enrollment');
const NotificationModel = require('../models/Notification');
const ApiError = require('../middleware/errorHandler').ApiError;

// =======================================================
// 1. إحصائيات لوحة التحكم
// =======================================================

/**
 * جلب إحصائيات لوحة تحكم المدرب
 */
exports.getDashboardStats = async (instructorId) => {
    // هذه الإحصائيات تتطلب استعلامات معقدة في الـ Model، لذا سنبسطها هنا

    const stats = await CourseModel.getInstructorStats(instructorId); // *افتراض: وجود دالة getInstructorStats في CourseModel*

    if (!stats) {
        return {
            totalCourses: 0,
            publishedCourses: 0,
            totalStudents: 0,
            pendingGrading: 0,
            totalRevenue: 0
        };
    }

    return stats;
};

// =======================================================
// 2. إدارة الطلاب والتحليلات
// =======================================================

/**
 * جلب الطلاب المسجلين في دورات المدرب
 */
exports.getStudentsByInstructor = async (instructorId) => {
    // *افتراض: وجود دالة getStudentsEnrolledInInstructorCourses في EnrollmentModel*
    const students = await EnrollmentModel.getStudentsEnrolledInInstructorCourses(instructorId);

    // يمكن إضافة منطق لحساب معدل التقدم لكل طالب هنا (مكلف)

    return students;
};

/**
 * جلب تحليلات دورة معينة (نسب الإنجاز، أداء الواجبات)
 */
exports.getCourseAnalytics = async (courseId, instructorId) => {
    // 1. التحقق من ملكية الدورة
    const course = await CourseModel.findById(courseId);
    if (!course || course.instructor_id !== instructorId) {
        throw new ApiError(403, 'Access denied. You do not own this course.');
    }

    // 2. جلب إحصائيات التحليل (مثلاً: معدل الإنجاز، توزيع الدرجات)
    const analytics = await EnrollmentModel.getCourseAnalytics(courseId); // *افتراض: وجود دالة getCourseAnalytics في EnrollmentModel*

    return analytics;
};

// =======================================================
// 3. التقييم والواجبات (Grading)
// =======================================================

// *سنبقي هذا القسم فارغًا حالياً لأنه يتطلب موديل جديد (AssignmentModel/SubmissionModel)*

// ولكن في مرحلة لاحقة، سنضع هنا دوال مثل:
// exports.getSubmissionsForGrading = async (instructorId) => {...}
// exports.gradeSubmission = async (instructorId, submissionId, grade, feedback) => {...}
// {
//    // ... منطق التحقق من الملكية
//    // ... تحديث جدول Submissions
//    // ... إنشاء إشعار للطالب
// }

// =======================================================
// 4. إدارة المستخدمين (Users Management)
// =======================================================

/**
 * جلب جميع المستخدمين (طلاب، مدربين، إداريين)
 */
exports.getAllUsers = async () => {
    // *افتراض: وجود دالة getAllUsers في UserModel*
    const users = await UserModel.getAllUsers();

    // يمكن إضافة منطق لإخفاء بيانات حساسة هنا

    return users;
};

/**
 * جلب مستخدم معين بالـ ID
 */
exports.getUserById = async (userId) => {
    // *افتراض: وجود دالة findById في UserModel*
    const user = await UserModel.findById(userId);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    return user;
};

/**
 * تحديث بيانات مستخدم
 */
exports.updateUser = async (userId, updateData, requestingUserId) => {
    // 1. التحقق من الصلاحيات
    // المدرب يمكنه تعديل بياناته فقط، أو بيانات طلابه (حسب السياسة)
    // هنا سنسمح بتعديل بيانات المستخدم نفسه

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // إذا لم يكن المستخدم هو نفسه، يجب أن يكون أدمن (سنضيف هذا لاحقاً)
    if (user._id.toString() !== requestingUserId.toString()) {
        throw new ApiError(403, 'Access denied. You can only update your own profile.');
    }

    // 2. تحديث البيانات
    // *افتراض: وجود دالة update في UserModel*
    const updatedUser = await UserModel.update(userId, updateData);

    return updatedUser;
};

/**
 * تفعيل/تعطيل حساب مستخدم
 */
exports.toggleUserStatus = async (userId, requestingUserId) => {
    // هذا يتطلب صلاحيات أدمن
    // سنضيف التحقق من الأدمن لاحقاً

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // تبديل الحالة
    user.is_active = !user.is_active;
    await user.save(); // *افتراض: استخدام Mongoose save*

    return user;
};

/**
 * حذف مستخدم
 */
exports.deleteUser = async (userId, requestingUserId) => {
    // هذا يتطلب صلاحيات أدمن
    // سنضيف التحقق من الأدمن لاحقاً

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // حذف المستخدم
    await UserModel.delete(userId); // *افتراض: وجود دالة delete في UserModel*

    return { message: 'User deleted successfully' };
};

/**
 * إعادة تعيين كلمة مرور مستخدم
 */
exports.resetUserPassword = async (userId, requestingUserId) => {
    // هذا يتطلب صلاحيات أدمن
    // سنضيف التحقق من الأدمن لاحقاً

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // إنشاء كلمة مرور جديدة
    const newPassword = generateRandomPassword(); // *دالة مساعدة*
    const hashedPassword = await bcrypt.hash(newPassword, 10); // *استخدام bcrypt*

    await UserModel.update(userId, { password: hashedPassword });

    // إرسال بريد إلكتروني للمستخدم (سنضيفه لاحقاً)

    return { message: 'Password reset successfully', newPassword };
};

// =======================================================
// 5. إدارة المشاريع (Project Management)
// =======================================================

/**
 * جلب جميع المشاريع
 */
exports.getAllProjects = async () => {
    // *افتراض: وجود دالة getAllProjects في ProjectModel*
    const projects = await ProjectModel.getAllProjects();

    return projects;
};

/**
 * تعيين مشروع لطالب
 */
exports.assignProject = async (projectId, studentId, instructorId) => {
    // 1. التحقق من وجود المشروع والطالب
    const project = await ProjectModel.findById(projectId);
    const student = await UserModel.findById(studentId);

    if (!project || !student) {
        throw new ApiError(404, 'Project or student not found');
    }

    // 2. التحقق من أن المدرب هو مالك المشروع (اختياري)
    if (project.instructor_id !== instructorId) {
        throw new ApiError(403, 'Access denied. You do not own this project.');
    }

    // 3. تعيين المشروع للطالب
    project.assigned_student_id = studentId;
    project.status = 'assigned';
    await project.save();

    // 4. إنشاء إشعار للطالب
    await NotificationModel.create({
        user_id: studentId,
        type: 'project_assigned',
        title: 'New Project Assigned',
        message: `You have been assigned a new project: ${project.title}`,
        is_read: false
    });

    return { message: 'Project assigned successfully' };
};

/**
 * تقديم ملاحظات على مشروع
 */
exports.submitProjectFeedback = async (projectId, feedback, instructorId) => {
    // 1. التحقق من وجود المشروع
    const project = await ProjectModel.findById(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    // 2. التحقق من أن المدرب هو مالك المشروع
    if (project.instructor_id !== instructorId) {
        throw new ApiError(403, 'Access denied. You do not own this project.');
    }

    // 3. حفظ الملاحظات
    project.feedback = feedback;
    project.status = 'feedback_submitted';
    await project.save();

    // 4. إنشاء إشعار للطالب
    await NotificationModel.create({
        user_id: project.assigned_student_id,
        type: 'project_feedback',
        title: 'Project Feedback',
        message: `You received feedback on your project: ${project.title}`,
        is_read: false
    });

    return { message: 'Feedback submitted successfully' };
};

/**
 * تحديث حالة المشروع
 */
exports.updateProjectStatus = async (projectId, status, instructorId) => {
    // 1. التحقق من وجود المشروع
    const project = await ProjectModel.findById(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    // 2. التحقق من الصلاحيات
    if (project.instructor_id !== instructorId) {
        throw new ApiError(403, 'Access denied. You do not own this project.');
    }

    // 3. تحديث الحالة
    project.status = status;
    await project.save();

    // 4. إنشاء إشعار للطالب
    await NotificationModel.create({
        user_id: project.assigned_student_id,
        type: 'project_status_update',
        title: 'Project Status Updated',
        message: `Your project status has been updated to: ${status}`,
        is_read: false
    });

    return { message: 'Project status updated successfully' };
};

/**
 * تحديث تفاصيل المشروع
 */
exports

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