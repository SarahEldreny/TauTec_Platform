// ============================================================================
// src/models/Assignment.js - Assignment Model
// نموذج الواجب/المهمة
// ============================================================================

const db = require('../config/database');

/**
 * نموذج الواجب (Assignment)
 */
class Assignment {
    /**
     * جلب جميع الواجبات المرتبطة بدرس معين
     * @param {number} lessonId - معرف الدرس
     * @returns {Promise<Array>} قائمة بالواجبات
     */
    static async getAssignmentsByLessonId(lessonId) {
        const sql = `
            SELECT id, lesson_id, title, description, due_date, max_score, created_at
            FROM assignments
            WHERE lesson_id = ?
            ORDER BY due_date ASC
        `;
        return db.query(sql, [lessonId]);
    }

    /**
     * إنشاء واجب جديد
     * @param {object} assignmentData - بيانات الواجب
     * @returns {Promise<number>} معرف الواجب الجديد
     */
    static async create(assignmentData) {
        const sql = `
            INSERT INTO assignments (lesson_id, title, description, due_date, max_score)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            assignmentData.lesson_id,
            assignmentData.title,
            assignmentData.description,
            assignmentData.due_date,
            assignmentData.max_score
        ];
        const result = await db.query(sql, params);
        return result.insertId;
    }

    // يمكن إضافة دوال أخرى حسب الحاجة
}

module.exports = Assignment;