// ============================================================================
// src/models/Submission.js - Submission Model
// نموذج تسليم الواجبات (Solutions)
// ============================================================================

const db = require('../config/database');

/**
 * نموذج التسليم (Submission)
 */
class Submission {
    /**
     * جلب جميع التسليمات الخاصة بواجب معين
     * @param {number} assignmentId - معرف الواجب
     * @returns {Promise<Array>} قائمة التسليمات
     */
    static async getSubmissionsByAssignmentId(assignmentId) {
        const sql = `
            SELECT id, assignment_id, student_id, submission_file_path, grade, feedback, submitted_at
            FROM submissions
            WHERE assignment_id = ?
            ORDER BY submitted_at DESC
        `;
        return db.query(sql, [assignmentId]);
    }

    /**
     * إنشاء تسليم جديد من قبل الطالب
     * @param {object} submissionData - بيانات التسليم
     * @returns {Promise<number>} معرف التسليم الجديد
     */
    static async create(submissionData) {
        const sql = `
            INSERT INTO submissions (assignment_id, student_id, submission_file_path, submitted_at)
            VALUES (?, ?, ?, NOW())
        `;
        const params = [
            submissionData.assignment_id,
            submissionData.student_id,
            submissionData.submission_file_path
        ];
        const result = await db.query(sql, params);
        return result.insertId;
    }

    // يمكن إضافة دوال أخرى لـ update و grade التسليم
}

module.exports = Submission;