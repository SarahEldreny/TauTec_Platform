// ============================================================================
// src/config/multer.js - File Upload Configuration
// ============================================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// تحديد مجلد التحميل
const uploadDir = path.join(__dirname, '../../uploads');

// التأكد من وجود المجلد
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد التخزين
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// فلترة الملفات المسموحة
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC/DOCX, PPT/PPTX, XLSX, JPG, PNG, and GIF are allowed.'), false);
    }
};

// إنشاء middleware multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

module.exports = upload;
