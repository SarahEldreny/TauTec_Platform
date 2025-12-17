// ============================================================================
// src/models/Module.js - Module Model
// نموذج الوحدة الدراسية (Module)
// ============================================================================

const db = require('../config/database'); // استيراد دوال الاتصال بقاعدة البيانات

/**
 * نموذج الوحدة الدراسية (Module)
 */
class Module {
    /**
     * جلب جميع الوحدات (Modules) المرتبطة بكورس معين
     * @param {number} courseId - معرف الكورس
     * @returns {Promise<Array>} قائمة بالوحدات
     */
    static async getModulesByCourseId(courseId) {
        const sql = `
            SELECT id, course_id, title, description, order_index, created_at
            FROM modules
            WHERE course_id = ?
            ORDER BY order_index ASC
        `;
        return db.query(sql, [courseId]);
    }

    /**
     * إنشاء وحدة دراسية جديدة
     * @param {object} moduleData - بيانات الوحدة (title, description, course_id, order_index)
     * @returns {Promise<number>} معرف الوحدة الجديدة
     */
    static async create(moduleData) {
        const sql = `
            INSERT INTO modules (course_id, title, description, order_index)
            VALUES (?, ?, ?, ?)
        `;
        const params = [
            moduleData.course_id,
            moduleData.title,
            moduleData.description,
            moduleData.order_index
        ];
        const result = await db.query(sql, params);
        return result.insertId;
    }

    // يمكن إضافة دوال أخرى مثل update و delete و getById لاحقاً
}

module.exports = Module;