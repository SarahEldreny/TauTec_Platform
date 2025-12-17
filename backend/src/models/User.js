// ============================================================================
// src/models/User.js - User Data Access Layer
// ============================================================================

const { query, queryOne } = require('../config/database');

// =======================================================
// 1. دوال القراءة (Read Operations)
// =======================================================

/**
 * البحث عن مستخدم عبر البريد الإلكتروني (لتسجيل الدخول والتحقق من التكرار)
 */
exports.findByEmail = async (email) => {
    // جلب جميع الحقول، بما في ذلك كلمة المرور المجزأة (مطلوب لتسجيل الدخول)
    const sql = `SELECT * FROM users WHERE email = ?`;
    return await queryOne(sql, [email]);
};

/**
 * البحث عن مستخدم عبر مُعرف (ID)
 */
exports.findById = async (userId) => {
    // جلب البيانات الأساسية فقط، دون كلمة المرور
    const sql = `SELECT id, email, role, first_name, last_name, phone, 
                 profile_picture, bio, interests, is_verified, is_active, created_at
                 FROM users WHERE id = ?`;
    return await queryOne(sql, [userId]);
};

/**
 * البحث عن مستخدم عبر رمز التحقق (لعملية verifyEmail)
 */
exports.findByVerificationToken = async (token) => {
    const sql = `SELECT id, email, role, is_verified FROM users WHERE verification_token = ?`;
    return await queryOne(sql, [token]);
};

/**
 * جلب مستخدمين بناءً على الدور (مطلوب لـ projectService.js و adminService.js)
 */
exports.findUsersByRole = async (role) => {
    const sql = `SELECT id, first_name, last_name, email FROM users WHERE role = ? AND is_active = TRUE`;
    return await query(sql, [role]);
};

// =======================================================
// 2. دوال الإنشاء والتحديث والمساعدة (Create & Update Operations)
// =======================================================

/**
 * إنشاء مستخدم جديد
 */
exports.create = async (userData) => {
    const { email, password, role, first_name, last_name, phone, verification_token } = userData;
    
    const sql = `
        INSERT INTO users (email, password, role, first_name, last_name, phone, verification_token)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [email, password, role, first_name, last_name, phone, verification_token];

    const result = await query(sql, params);
    return result.insertId;
};

/**
 * تحديث الملف الشخصي للمستخدم (لتحديث ملف التعريف العادي)
 */
exports.updateProfile = async (userId, updateData) => {
    // هذه الدالة موجودة بالفعل في الكود السابق، يتم الاحتفاظ بها
    const setClauses = [];
    const params = [];

    for (const key in updateData) {
        if (updateData[key] !== undefined) {
            setClauses.push(`${key} = ?`);
            params.push(updateData[key]);
        }
    }

    if (setClauses.length === 0) return;

    const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
    params.push(userId);

    await query(sql, params);
};


/**
 * تحديث حالة التحقق للمستخدم بعد تأكيد البريد الإلكتروني
 */
exports.verifyUser = async (userId) => {
    const sql = `UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?`;
    await query(sql, [userId]);
};

/**
 * تحديث حالة آخر تسجيل دخول
 */
exports.updateLastLogin = async (userId) => {
    const sql = `UPDATE users SET last_login = NOW() WHERE id = ?`;
    await query(sql, [userId]);
};

// =======================================================
// 3. دوال إدارة المشرفين (Admin Management)
// =======================================================

/**
 * جلب جميع المستخدمين مع الفلترة والتقسيم (مطلوب لـ adminService.js)
 */
exports.findAll = async (filters) => {
    const { role, status, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let sql = 'SELECT id, email, role, first_name, last_name, phone, is_verified, is_active, last_login, created_at FROM users WHERE 1=1';
    const params = [];
    
    // فلترة الدور
    if (role) {
        sql += ' AND role = ?';
        params.push(role);
    }
    // فلترة الحالة
    if (status === 'active') {
        sql += ' AND is_active = TRUE';
    } else if (status === 'inactive') {
        sql += ' AND is_active = FALSE';
    }
    // فلترة البحث
    if (search) {
        sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // التقسيم والترتيب
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const users = await query(sql, params);

    // جلب العدد الكلي
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    // يجب تكرار منطق الفلترة للعد الكلي
    if (role) countSql += ' AND role = ?'; countParams.push(role);
    if (status === 'active') countSql += ' AND is_active = TRUE';
    else if (status === 'inactive') countSql += ' AND is_active = FALSE';
    if (search) countSql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);

    const totalCount = await queryOne(countSql, countParams);

    return { 
        data: users, 
        total: totalCount ? totalCount.total : 0, 
        totalPages: Math.ceil((totalCount ? totalCount.total : 0) / limit) 
    };
};

/**
 * تحديث بيانات المستخدم بواسطة المشرف (يشمل تعديل الدور أو الحالة أو كلمة المرور المشفرة)
 */
exports.updateByAdmin = async (userId, updateData) => {
    const setClauses = [];
    const params = [];

    for (const key in updateData) {
        if (updateData[key] !== undefined && key !== 'id') {
            // ملاحظة: يُفترض أن كلمة المرور (إذا تم إرسالها) تكون مُشفرة مسبقاً في الـ Service
            setClauses.push(`${key} = ?`);
            params.push(updateData[key]);
        }
    }

    if (setClauses.length === 0) return;

    const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
    params.push(userId);

    await query(sql, params);
};

/**
 * تحديث حالة التفعيل (نشط/غير نشط)
 */
exports.updateStatus = async (userId, newStatus) => {
    const sql = `UPDATE users SET is_active = ? WHERE id = ?`;
    await query(sql, [newStatus, userId]);
};

/**
 * حذف مستخدم
 */
exports.deleteUser = async (userId) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    await query(sql, [userId]);
};