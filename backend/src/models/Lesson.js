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
            SELECT id, module_id, title, content_type, content_url, order_index, created_at
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
            INSERT INTO lessons (module_id, title, content_type, content_url, order_index)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            lessonData.module_id,
            lessonData.title,
            lessonData.content_type,
            lessonData.content_url,
            lessonData.order_index
        ];
        const result = await db.query(sql, params);
        return result.insertId;
    }

    // يمكن إضافة دوال أخرى مثل update و delete و getById لاحقاً
}

module.exports = Lesson;