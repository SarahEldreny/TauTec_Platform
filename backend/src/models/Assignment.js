// ============================================================================
// src/models/Assignment.js - Assignment Model
// نموذج الواجب/المهمة
// ============================================================================

const { query, queryOne } = require('../config/database');

/**
 * جلب جميع الواجبات المرتبطة بدورة معينة
 */
exports.findByCourseId = async (courseId) => {
    const sql = `
        SELECT a.*, c.title as course_title, u.first_name, u.last_name
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON a.created_by = u.id
        WHERE a.course_id = ?
        ORDER BY a.due_date ASC
    `;
    return await query(sql, [courseId]);
};

/**
 * جلب جميع الواجبات المرتبطة بمدرس معين
 */
exports.findByInstructorId = async (instructorId) => {
    const sql = `
        SELECT a.*, c.title as course_title, c.instructor_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE c.instructor_id = ?
        ORDER BY a.due_date DESC
    `;
    return await query(sql, [instructorId]);
};

/**
 * جلب واجب محدد بناءً على المعرف
 */
exports.findById = async (assignmentId) => {
    const sql = `
        SELECT a.*, 
               c.title as course_title, 
               c.instructor_id,
               u.first_name, u.last_name
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON a.created_by = u.id
        WHERE a.id = ?
    `;
    return await queryOne(sql, [assignmentId]);
};

/**
 * إنشاء واجب جديد
 */
exports.create = async (assignmentData) => {
    const { course_id, title, description, due_date, max_score, created_by } = assignmentData;
    
    const sql = `
        INSERT INTO assignments (course_id, title, description, due_date, max_score, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [course_id, title, description, due_date, max_score, created_by];
    const result = await query(sql, params);
    return result.insertId;
};

/**
 * تحديث واجب
 */
exports.update = async (assignmentId, updateData) => {
    const { title, description, due_date, max_score } = updateData;
    
    const sql = `
        UPDATE assignments
        SET title = ?, description = ?, due_date = ?, max_score = ?
        WHERE id = ?
    `;
    const params = [title, description, due_date, max_score, assignmentId];
    return await query(sql, params);
};

/**
 * حذف واجب
 */
exports.delete = async (assignmentId) => {
    const sql = `DELETE FROM assignments WHERE id = ?`;
    return await query(sql, [assignmentId]);
};

/**
 * جلب إحصائيات الواجب
 */
exports.getStats = async (assignmentId) => {
    const sql = `
        SELECT 
            COUNT(DISTINCT e.id) as total_students,
            COUNT(DISTINCT s.id) as submitted_count,
            AVG(s.score) as avg_score,
            MAX(s.score) as max_score,
            MIN(s.score) as min_score
        FROM assignments a
        LEFT JOIN courses c ON a.course_id = c.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN submissions s ON a.id = s.assignment_id
        WHERE a.id = ?
    `;
    return await queryOne(sql, [assignmentId]);
};