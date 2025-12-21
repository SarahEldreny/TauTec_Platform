// ============================================================================
// src/config/database.js - MySQL Connection Pool Setup (using 'mysql2')
// ============================================================================
const mysql = require('mysql2/promise');

// 1. إنشاء مجمع الاتصالات (Connection Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tautec_platform',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * اختبار الاتصال بقاعدة البيانات
 */
exports.testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1'); // استعلام بسيط للتحقق
        connection.release();
        console.log('✅ Database connection successful! (MySQL)');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// =======================================================
// 2. دوال مساعدة لتنفيذ الاستعلامات (SQL Query Helpers)
// =======================================================

/**
 * دالة لتنفيذ أي استعلام SQL (INSERT, UPDATE, DELETE, SELECT)
 */
exports.query = async (sql, params = []) => {
    try {
        const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        
        // تنفيذ الاستعلام باستخدام mysql2
        const [rows, fields] = await pool.query(sql, params);
        
        // محاكاة نتيجة MySQL (insertId) لتناسق مع طبقة الموديل
        if (isInsert) {
            return { 
                insertId: rows.insertId || null,
                rows: rows
            };
        }
        
        // إرجاع مصفوفة الصفوف لـ SELECT, UPDATE, DELETE
        return rows;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

/**
 * دالة لتنفيذ استعلام يتوقع صفًا واحداً فقط
 */
exports.queryOne = async (sql, params = []) => {
    try {
        const [rows, fields] = await pool.query(sql, params);
        
        // إرجاع الصف الأول أو null
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

// تصدير المجمع للاستخدام المباشر إذا لزم الأمر
exports.pool = pool;