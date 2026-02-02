// ============================================================================
// src/models/Submission.js - Submission Model
// نموذج تسليم الواجبات (Solutions)
// ============================================================================

const { query, queryOne } = require('../config/database');

/**
 * جلب جميع التسليمات لواجب محدد
 */
exports.findByAssignmentId = async (assignmentId) => {
    const sql = `
        SELECT s.*, u.first_name, u.last_name, u.email, a.max_score
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.assignment_id = ?
        ORDER BY s.submitted_at DESC
    `;
    return await query(sql, [assignmentId]);
};

/**
 * جلب التسليمات الخاصة بطالب معين في واجب معين
 */
exports.findByStudentAndAssignment = async (assignmentId, studentId) => {
    const sql = `
        SELECT s.*, a.max_score
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.assignment_id = ? AND s.student_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT 1
    `;
    return await queryOne(sql, [assignmentId, studentId]);
};

/**
 * جلب تسليم محدد بناءً على المعرف
 */
exports.findById = async (submissionId) => {
    const sql = `
        SELECT s.*, 
               u.first_name, u.last_name, u.email,
               a.title as assignment_title, a.max_score,
               c.title as course_title
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.id = ?
    `;
    return await queryOne(sql, [submissionId]);
};

/**
 * إنشاء تسليم جديد
 */
exports.create = async (submissionData) => {
    const { assignment_id, student_id, file_path } = submissionData;
    
    const sql = `
        INSERT INTO submissions (assignment_id, student_id, file_path, submitted_at)
        VALUES (?, ?, ?, NOW())
    `;
    const params = [assignment_id, student_id, file_path];
    const result = await query(sql, params);
    return result.insertId;
};

/**
 * تحديث درجة وملاحظات التسليم
 */
exports.updateGrade = async (submissionId, gradeData) => {
    const { score, feedback } = gradeData;
    
    const sql = `
        UPDATE submissions
        SET score = ?, feedback = ?, graded_at = NOW()
        WHERE id = ?
    `;
    const params = [score, feedback, submissionId];
    return await query(sql, params);
};

/**
 * حذف تسليم
 */
exports.delete = async (submissionId) => {
    const sql = `DELETE FROM submissions WHERE id = ?`;
    return await query(sql, [submissionId]);
};

/**
 * جلب إحصائيات التسليمات
 */
exports.getStats = async (assignmentId) => {
    const sql = `
        SELECT 
            COUNT(*) as total_submissions,
            COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as graded_count,
            COUNT(CASE WHEN score IS NULL THEN 1 END) as pending_count,
            AVG(score) as avg_score,
            MAX(score) as highest_score,
            MIN(score) as lowest_score
        FROM submissions
        WHERE assignment_id = ?
    `;
    return await queryOne(sql, [assignmentId]);
};

/**
 * جلب تسليمات لم يتم تقييمها
 */
exports.findUngraded = async (assignmentId) => {
    const sql = `
        SELECT s.*, u.first_name, u.last_name, u.email
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        WHERE s.assignment_id = ? AND s.score IS NULL
        ORDER BY s.submitted_at ASC
    `;
    return await query(sql, [assignmentId]);
};