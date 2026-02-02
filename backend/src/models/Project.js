// ============================================================================
// src/models/Project.js - Project Data Access Layer
// يتعامل مع جداول projects, project_feedback, project_files
// ============================================================================

const { query, queryOne } = require('../config/database');

// =======================================================
// 1. دوال المشاريع (Projects)
// =======================================================

/**
 * إنشاء طلب مشروع جديد
 */
exports.create = async (projectData) => {
    const { client_id, title, description, project_type, category, requirements } = projectData;
    const sql = `
        INSERT INTO projects 
        (client_id, title, description, project_type, category, requirements, status)
        VALUES (?, ?, ?, ?, ?, ?, 'submitted')
    `;
    const result = await query(sql, [client_id, title, description, project_type, category, requirements]);
    return result.insertId;
};

/**
 * جلب جميع مشاريع العميل (Client)
 */
exports.findByClient = async (clientId) => {
    const sql = `
        SELECT p.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name
        FROM projects p
        LEFT JOIN users u ON p.assigned_to = u.id
        WHERE p.client_id = ?
        ORDER BY p.created_at DESC
    `;
    return await query(sql, [clientId]);
};

/**
 * جلب مشروع واحد حسب المُعرف
 */
exports.findById = async (projectId) => {
    const sql = `
        SELECT p.*, 
               u1.first_name as client_first_name, u1.last_name as client_last_name,
               u2.first_name as instructor_first_name, u2.last_name as instructor_last_name
        FROM projects p
        JOIN users u1 ON p.client_id = u1.id
        LEFT JOIN users u2 ON p.assigned_to = u2.id
        WHERE p.id = ?
    `;
    return await queryOne(sql, [projectId]);
};

/**
 * تحديث بيانات المشروع
 */
exports.update = async (projectId, projectData) => {
    const { title, description, project_type, category, requirements } = projectData;
    const sql = `
        UPDATE projects 
        SET title = ?, description = ?, project_type = ?, category = ?, requirements = ?
        WHERE id = ?
    `;
    await query(sql, [title, description, project_type, category, requirements, projectId]);
};


// =======================================================
// 2. دوال الإشراف والتقارير (Admin & Instructor)
// =======================================================

/**
 * تعيين مدرب (Instructor) لمشروع
 */
exports.assignInstructor = async (projectId, instructorId) => {
    const sql = 'UPDATE projects SET assigned_to = ?, status = ? WHERE id = ?';
    await query(sql, [instructorId, 'in_progress', projectId]);
};

/**
 * إضافة تقييم وملاحظات على المشروع
 */
exports.addFeedback = async (projectId, instructorId, grade, comments, reportFilePath = null) => {
    const sql = `
        INSERT INTO project_feedback (project_id, instructor_id, grade, comments, report_file_path)
        VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [projectId, instructorId, grade, comments, reportFilePath]);
    
    // تحديث حالة المشروع في جدول Projects
    await query("UPDATE projects SET status = 'completed', completed_at = NOW() WHERE id = ?", [projectId]);
    
    return result.insertId;
};

/**
 * جلب آخر تقرير (Feedback) لمشروع معين
 */
exports.getLatestFeedback = async (projectId) => {
    const sql = `
        SELECT pf.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name
        FROM project_feedback pf
        JOIN users u ON pf.instructor_id = u.id
        WHERE pf.project_id = ?
        ORDER BY pf.created_at DESC
        LIMIT 1
    `;
    return await queryOne(sql, [projectId]);
};