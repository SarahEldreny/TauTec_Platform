// ============================================================================
// src/models/Course.js - Course Data Access Layer
// يتعامل مع جداول courses, modules, lessons
// ============================================================================

const { query, queryOne } = require('../config/database');

// =======================================================
// 1. دوال الدورات (Courses)
// =======================================================

/**
 * جلب جميع الدورات المنشورة مع بيانات المدرب والطلاب المسجلين
 * @param {object} filters - فلاتر البحث (category, difficulty, search)
 * @returns {Array} - قائمة الدورات
 */
exports.findAllPublished = async (filters) => {
    const { category, difficulty, search } = filters;
    let sql = `
        SELECT c.*, 
               u.first_name AS instructor_first_name, 
               u.last_name AS instructor_last_name,
               COUNT(DISTINCT e.id) AS enrolled_students
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.status = 'published'
    `;
    const params = [];

    if (category) {
        sql += ' AND c.category = ?';
        params.push(category);
    }
    if (difficulty) {
        sql += ' AND c.difficulty = ?';
        params.push(difficulty);
    }
    if (search) {
        sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY c.id ORDER BY c.created_at DESC';
    return await query(sql, params);
};

/**
 * جلب دورة واحدة حسب المُعرف
 * @param {number} courseId - مُعرف الدورة
 * @returns {object|null} - بيانات الدورة
 */
exports.findById = async (courseId) => {
    const sql = `
        SELECT c.*, u.first_name AS instructor_first_name, u.last_name AS instructor_last_name
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.id = ?
    `;
    return await queryOne(sql, [courseId]);
};

/**
 * إنشاء دورة جديدة
 */
exports.create = async (courseData) => {
    const { instructorId, title, description, category, difficulty, price, duration, imagePath } = courseData;
    const sql = `
        INSERT INTO courses (instructor_id, title, description, category, difficulty, price, duration, image_path, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `;
    const result = await query(sql, [instructorId, title, description, category, difficulty, price, duration, imagePath]);
    return result.insertId;
};


// =======================================================
// 2. دوال الوحدات والدروس (Modules & Lessons)
// =======================================================

/**
 * إضافة وحدة (Module) جديدة لدورة
 */
exports.addModule = async (courseId, title, description, orderIndex) => {
    const sql = `
        INSERT INTO modules (course_id, title, description, order_index)
        VALUES (?, ?, ?, ?)
    `;
    const result = await query(sql, [courseId, title, description, orderIndex]);
    return result.insertId;
};

/**
 * إضافة درس (Lesson) جديد لوحدة
 */
exports.addLesson = async (moduleId, title, lessonType, duration, orderIndex, videoUrl, isFree) => {
    const sql = `
        INSERT INTO lessons (module_id, title, lesson_type, duration, order_index, video_url, is_free)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [moduleId, title, lessonType, duration, order_index, videoUrl, isFree]);
    return result.insertId;
};

/**
 * جلب جميع الوحدات والدروس لدورة
 */
exports.getCourseStructure = async (courseId) => {
    const modules = await query('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC', [courseId]);
    
    for (const module of modules) {
        module.lessons = await query('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC', [module.id]);
    }

    return modules;
};