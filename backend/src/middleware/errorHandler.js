// ============================================================================
// ERROR HANDLER MIDDLEWARE (Must accept 4 parameters: err, req, res, next)
// ============================================================================

// تعريف فئة خطأ مخصص (Custom Error Class) لمعالجة أخطاء API المحددة
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational; // للتمييز بين أخطاء المطور وأخطاء التشغيل
        Error.captureStackTrace(this, this.constructor);
    }
}

// دالة معالجة الأخطاء الرئيسية (يجب تصديرها)
const errorHandler = (err, req, res, next) => {
    // 1. القيمة الافتراضية لحالة الخطأ والرسالة
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // 2. التعامل مع أخطاء محددة (Handling Specific Errors)

    // أ. أخطاء JWT (إذا لم يتم التعامل معها بالفعل في verifyToken)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication failed. Invalid or expired token.';
    }

    // ب. أخطاء MySQL الشائعة (مثل فشل الاتصال أو خطأ في الاستعلام)
    if (err.code && err.code.startsWith('ER_')) {
        // مثال: ER_DUP_ENTRY (خطأ تكرار المدخلات)
        if (err.code === 'ER_DUP_ENTRY') {
            statusCode = 409; // Conflict
            message = 'Data conflict: Record already exists or a unique field (like email) is duplicated.';
        } else {
            // التعامل مع أخطاء DB الأخرى كخطأ خادم
            message = `Database Error: ${message}`;
            statusCode = 500;
        }
    }
    
    // ج. أخطاء Joi أو Validation (يحدث عند فشل التحقق من البيانات)
    if (err.isJoi || err.name === 'ValidationError') {
        statusCode = 400; // Bad Request
        // عرض رسالة الخطأ الأولى من قائمة أخطاء Joi
        message = err.details ? err.details[0].message : message;
    }

    // د. أخطاء Multer (خاصة برفع الملفات)
    if (err.name === 'MulterError') {
        statusCode = 400;
        message = `File upload error: ${err.message}`;
    }

    // 3. تسجيل الخطأ (Logging)
    // لا تسجل الأخطاء التشغيلية المعروفة (مثل 404) في log الخطيرة
    if (statusCode >= 500 || err.isOperational === false) {
        console.error('SERVER ERROR:', err);
    } else {
        console.warn('CLIENT ERROR:', message);
    }

    // 4. إرسال الاستجابة (Sending Response)
    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message,
        // إظهار Stack Trace فقط في وضع التطوير
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;
// يمكنك أيضاً تصدير فئة ApiError لاستخدامها في Controllers
module.exports.ApiError = ApiError;