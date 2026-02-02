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
        await connection.query('SELECT 1');
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
 * Using pool.query instead of pool.execute for better type coercion with LIMIT/OFFSET
 */
exports.query = async (sql, params = []) => {
    try {
        const [rows, fields] = await pool.query(sql, params);

        // للاستعلامات INSERT، إرجاع insertId
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
            return {
                insertId: rows.insertId,
                affectedRows: rows.affectedRows,
                rows: rows
            };
        }

        // للاستعلامات UPDATE/DELETE، إرجاع affectedRows
        if (sql.trim().toUpperCase().startsWith('UPDATE') ||
            sql.trim().toUpperCase().startsWith('DELETE')) {
            return {
                affectedRows: rows.affectedRows,
                rows: rows
            };
        }

        // للاستعلامات SELECT، إرجاع الصفوف مباشرة
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
    const [rows] = await pool.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
};