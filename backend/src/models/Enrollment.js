// ============================================================================
// src/models/Enrollment.js - Enrollment and Progress Data Access Layer
// يتعامل مع جداول enrollments و progress
// ============================================================================

const { query, queryOne } = require('../config/database');

// =======================================================
// 1. دوال التسجيل (Enrollments)
// =======================================================

/**
 * التحقق من وجود تسجيل سابق لطالب في دورة
 */
exports.findByStudentAndCourse = async (studentId, courseId) => {
    const sql = 'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?';
    return await queryOne(sql, [studentId, courseId]);
};

/**
 * إنشاء تسجيل جديد
 */
exports.createEnrollment = async (studentId, courseId) => {
    const sql = 'INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, ?)';
    await query(sql, [studentId, courseId, 'active']);
    // تحديث عدد المسجلين في جدول الدورات (للسرعة)
    await query('UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = ?', [courseId]);
};

/**
 * جلب جميع الدورات المسجل بها الطالب
 */
exports.getEnrolledCoursesByStudent = async (studentId) => {
    const sql = `
        SELECT c.id, c.title, c.image_path, c.difficulty,
               u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
               e.enrolled_at, e.status AS enrollment_status
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = ? AND e.status = 'active'
        ORDER BY e.enrolled_at DESC
    `;
    return await query(sql, [studentId]);
};


// =======================================================
// 2. دوال التقدم (Progress)
// =======================================================

/**
 * تسجيل إكمال الطالب لدرس معين
 */
exports.completeLesson = async (studentId, lessonId, timeSpent) => {
    // التحقق أولاً من عدم وجود سجل إكمال مسبق
    const existingProgress = await queryOne(
        'SELECT id FROM progress WHERE student_id = ? AND lesson_id = ?',
        [studentId, lessonId]
    );

    if (existingProgress) {
        // إذا كان موجوداً، يمكننا تحديث وقت المشاهدة أو تجاهله
        await query('UPDATE progress SET time_spent = time_spent + ? WHERE id = ?', [timeSpent, existingProgress.id]);
        return false; // يعني لم يكن الإكمال الأول
    }

    // إدخال سجل جديد لإنهاء الدرس
    const sql = 'INSERT INTO progress (student_id, lesson_id, time_spent, is_completed) VALUES (?, ?, ?, TRUE)';
    await query(sql, [studentId, lessonId, timeSpent]);
    return true; // يعني تم إكمال الدرس لأول مرة
};

/**
 * جلب تقدم الطالب في دورة معينة (نسبة الإنجاز)
 */
exports.getCourseProgress = async (studentId, courseId) => {
    const totalLessons = await queryOne(
        `SELECT COUNT(l.id) AS total
         FROM lessons l
         JOIN modules m ON l.module_id = m.id
         WHERE m.course_id = ?`,
        [courseId]
    );

    const completedLessons = await queryOne(
        `SELECT COUNT(p.id) AS completed
         FROM progress p
         JOIN lessons l ON p.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE p.student_id = ? AND m.course_id = ? AND p.is_completed = TRUE`,
        [studentId, courseId]
    );

    const total = totalLessons.total || 0;
    const completed = completedLessons.completed || 0;
    const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

    return { totalLessons: total, completedLessons: completed, progress: parseFloat(progressPercentage.toFixed(2)) };
};