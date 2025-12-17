// ============================================================================
// src/config/database.js - PostgreSQL Connection Pool Setup (using 'pg')
// ============================================================================
const { Pool } = require('pg'); // استخدام حزمة pg للتعامل مع PostgreSQL

// 1. إنشاء مجمع الاتصالات (Connection Pool)
const pool = new Pool({
    // استخدام الـ Connection String الذي تم إعداده في ملف .env
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        // تفعيل SSL مطلوب لمعظم الاتصالات السحابية مثل Supabase
        rejectUnauthorized: false
    }
});

/**
 * اختبار الاتصال بقاعدة البيانات
 */
exports.testConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1'); // استعلام بسيط للتحقق
        client.release();
        console.log('✅ Database connection successful! (PostgreSQL/Supabase)');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// =======================================================
// 2. دوال مساعدة لتنفيذ الاستعلامات (SQL Query Helpers)
// =======================================================

// دالة مساعدة لتحويل علامات الاستفهام (?) إلى $1, $2, ...
const formatPostgresQuery = (sql) => {
    let index = 1;
    // يجب تمرير مصفوفة المعطيات مع الـ SQL لكي يتم ربطها تلقائياً
    return sql.replace(/\?/g, () => `$${index++}`);
};

/**
 * دالة لتنفيذ أي استعلام SQL (INSERT, UPDATE, DELETE, SELECT)
 */
exports.query = async (sql, params = []) => {
    try {
        let formattedSql = formatPostgresQuery(sql);
        const isInsert = formattedSql.trim().toUpperCase().startsWith('INSERT');
        
        // إذا كان الاستعلام INSERT، نتأكد من إضافة RETURNING ID
        if (isInsert && !formattedSql.toUpperCase().includes('RETURNING')) {
             // إضافة RETURNING ID للحصول على الـ ID الذي تم إنشاؤه حديثاً (مثل insertId في MySQL)
             formattedSql += ' RETURNING id'; 
        }

        const result = await pool.query(formattedSql, params);
        
        // محاكاة نتيجة MySQL (insertId) لعدم كسر طبقة الموديل
        if (isInsert) {
            return { 
                insertId: result.rows.length > 0 ? result.rows[0].id : null,
                rows: result.rows 
            };
        }
        
        // إرجاع مصفوفة الصفوف لـ SELECT, UPDATE, DELETE
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

/**
 * دالة لتنفيذ استعلام يتوقع صفًا واحداً فقط
 */
exports.queryOne = async (sql, params = []) => {
    let formattedSql = formatPostgresQuery(sql);
    const result = await pool.query(formattedSql, params);
    
    // إرجاع الصف الأول أو null
    return result.rows.length > 0 ? result.rows[0] : null;
};