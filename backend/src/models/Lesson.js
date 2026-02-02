// ============================================================================
// src/models/Lesson.js - Lesson Model
// نموذج الدرس (Lesson)
// ============================================================================

const db = require('../config/database'); // استيراد دوال الاتصال بقاعدة البيانات

/**
 * نموذج الدرس
 */
class Lesson {
    /**
     * جلب جميع الدروس المرتبطة بوحدة دراسية معينة
     * @param {number} moduleId - معرف الوحدة الدراسية
     * @returns {Promise<Array>} قائمة بالدروس
     */
    static async getLessonsByModuleId(moduleId) {
        const sql = `
            SELECT id, module_id, title, lesson_type, duration, order_index, video_url, is_free, created_at
            FROM lessons
            WHERE module_id = ?
            ORDER BY order_index ASC
        `;
        return db.query(sql, [moduleId]);
    }

    /**
     * إنشاء درس جديد
     * @param {object} lessonData - بيانات الدرس (title, module_id, content_type, content_url, order_index)
     * @returns {Promise<number>} معرف الدرس الجديد
     */
    static async create(lessonData) {
        const sql = `
            INSERT INTO lessons (module_id, title, content, lesson_type, duration, order_index, video_url, is_free)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            lessonData.module_id,
            lessonData.title,
            lessonData.content || null,
            lessonData.lesson_type || 'text',
            lessonData.duration || null,
            lessonData.order_index,
            lessonData.video_url || null,
            lessonData.is_free ? 1 : 0
        ];
        const result = await db.query(sql, params);
        return result.insertId;
    }

    /**
     * Get next order index for a module
     * @param {number} moduleId
     * @returns {Promise<number>}
     */
    static async getNextOrderIndex(moduleId) {
        const sql = `
            SELECT COALESCE(MAX(order_index), 0) + 1 AS nextOrder
            FROM lessons
            WHERE module_id = ?
        `;
        const row = await db.queryOne(sql, [moduleId]);
        return row ? row.nextOrder : 1;
    }

    // يمكن إضافة دوال أخرى مثل update و delete و getById لاحقاً
}

module.exports = Lesson;
