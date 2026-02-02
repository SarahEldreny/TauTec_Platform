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
 * جلب جميع الدورات بدون فلترة الحالة (للأدمن)
 * @param {object} filters - فلاتر البحث (category, difficulty, search)
 * @returns {Array} - قائمة جميع الدورات
 */
exports.findAll = async (filters = {}) => {
    const { category, difficulty, search } = filters;
    let sql = `
        SELECT c.*, 
               u.first_name AS instructor_first_name, 
               u.last_name AS instructor_last_name,
               CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
               c.status AS is_published,
               COUNT(DISTINCT e.id) AS enrollment_count
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE 1=1
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
    const { instructor_id, title, description, category, difficulty, price, duration_weeks, max_students, thumbnail_url } = courseData;
    const sql = `
        INSERT INTO courses (instructor_id, title, description, category, difficulty, price, duration, thumbnail, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `;
    const result = await query(sql, [instructor_id, title, description, category, difficulty, price || 0, duration_weeks || 0, thumbnail_url || null]);
    return result.insertId;
};

/**
 * تحديث دورة
 */
exports.update = async (courseId, updateData) => {
    const fieldMap = {
        'title': 'title',
        'description': 'description',
        'category': 'category',
        'difficulty': 'difficulty',
        'price': 'price',
        'duration_weeks': 'duration',
        'max_students': 'max_students',
        'thumbnail_url': 'thumbnail'
    };
    
    const updates = {};
    
    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (updateData[key] !== undefined) {
            updates[dbField] = updateData[key];
        }
    }
    
    const fields = Object.keys(updates).map(f => `${f} = ?`).join(', ');
    const values = Object.values(updates);
    
    if (fields.length === 0) return;
    
    const sql = `UPDATE courses SET ${fields} WHERE id = ?`;
    await query(sql, [...values, courseId]);
};

/**
 * نشر دورة (تغيير الحالة من draft إلى published)
 */
exports.publish = async (courseId) => {
    const sql = `UPDATE courses SET status = 'published' WHERE id = ?`;
    await query(sql, [courseId]);
};

/**
 * نشر جميع المسودات (للهجرة والاختبار)
 */
exports.publishAllDrafts = async () => {
    const sql = `UPDATE courses SET status = 'published' WHERE status = 'draft'`;
    await query(sql);
};

/**
 * جلب جميع دورات المدرب (تشمل المسودات والمنشورة)
 */
exports.findInstructorCourses = async (instructorId) => {
    const sql = `
        SELECT c.*, 
               u.first_name AS instructor_first_name, 
               u.last_name AS instructor_last_name,
               COUNT(DISTINCT e.id) AS enrollment_count,
               0 AS rating
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.instructor_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `;
    return await query(sql, [instructorId]);
};

/**
 * جلب تفاصيل الدورة مع الوحدات والدروس
 */
exports.findDetailsById = async (courseId) => {
    const sql = `
        SELECT c.*, 
               u.first_name AS instructor_first_name, 
               u.last_name AS instructor_last_name,
               COUNT(DISTINCT e.id) AS enrolled_students
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.id = ?
        GROUP BY c.id
    `;
    return await queryOne(sql, [courseId]);
};

/**
 * حذف دورة
 */
exports.delete = async (courseId) => {
    const sql = `DELETE FROM courses WHERE id = ?`;
    await query(sql, [courseId]);
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