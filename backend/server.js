// ============================================================================
// server.js - TauTec Platform Backend Entry Point
// ============================================================================

// 1. إعداد المتغيرات البيئية (Environment Setup)
// قراءة المتغيرات من ملف .env (مثل PORT, JWT_SECRET, DB_HOST)
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // لتمكين طلبات Cross-Origin (مهم للربط مع Frontend)
const helmet = require('helmet'); // لحماية التطبيق عبر تعيين رؤوس HTTP آمنة
const morgan = require('morgan'); // لتسجيل طلبات HTTP في الطرفية (لأغراض التطوير)
const path = require('path'); // للتعامل مع مسارات الملفات (مثل الملفات الثابتة)

const app = express(); // إنشاء نسخة من تطبيق Express

// =======================================================
// 2. استدعاء المكونات الأساسية والنظامية
// =======================================================

// استدعاء دالة اختبار الاتصال بقاعدة البيانات (للتأكد من أنها تعمل قبل بدء الخادم)
const { testConnection } = require('./src/config/database');
// استدعاء دالة معالج الأخطاء العالمي (الذي أنشأناه سابقاً)
const errorHandler = require('./src/middleware/errorHandler');

// استدعاء ملفات التوجيه (Routes) لكل قسم من أقسام الـ API
const authRoutes = require('./src/routes/auth.routes');
const courseRoutes = require('./src/routes/courses.routes');
const studentRoutes = require('./src/routes/students.routes');
const instructorRoutes = require('./src/routes/instructors.routes');
const assignmentRoutes = require('./src/routes/assignments.routes');
// const clientRoutes = require('./src/routes/clients.routes');
// const adminRoutes = require('./src/routes/admin.routes');
const messageRoutes = require('./src/routes/messages.routes');
const notificationRoutes = require('./src/routes/notifications.routes');

// =======================================================
// 3. تهيئة Middleware (تُطبق على جميع الطلبات)
// =======================================================

// Configure helmet with relaxed CSP to allow inline scripts and Socket.IO
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],  // Allow Socket.IO CDN
            scriptSrcAttr: ["'unsafe-inline'"],        // Allow onclick handlers
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000"]  // Allow WebSocket
        }
    }
}));
app.use(cors({ // تفعيل CORS مع السماح بـ Cookies وبيانات الاعتماد (credentials)
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // السماح لعنوان الـ Frontend المحدد
    credentials: true // مهم إذا كنتِ تستخدمين Cookies أو الـ Headers مخصص
}));
app.use(express.json()); // تحليل (Parse) لـ JSON Body في الطلبات القادمة (مطلوب للـ APIs)
app.use(express.urlencoded({ extended: true })); // تحليل البيانات المرسلة عبر Form Data
app.use(morgan('dev')); // استخدام Morgan لعرض معلومات الطلبات في وضع التطوير

// =======================================================
// 4. الملفات الثابتة (Static Files)
// =======================================================

// إتاحة مجلد 'uploads' ليكون مجلد عام لملفات الصور والمواد المرفوعة (ST-05)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// توجيه الطلبات لعرض ملفات الـ Frontend الثابتة (لدمج الـ Backend مع الـ Frontend في نفس السيرفر)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// =======================================================
// 5. توجيه الـ API (Mapping Routes)
// =======================================================

app.use('/api/auth', authRoutes); // مسارات التسجيل والمصادقة (ST-01)
app.use('/api/courses', courseRoutes); // مسارات الكورسات العامة (ST-02)
app.use('/api/student', studentRoutes); // مسارات خاصة بالطلاب
app.use('/api/instructor', instructorRoutes); // مسارات خاصة بالمدربين (ST-04, ST-05)
app.use('/api/assignments', assignmentRoutes); // مسارات الواجبات والمهام
// app.use('/api/client', clientRoutes); // مسارات خاصة بالعملاء (ST-06, ST-11)
// app.use('/api/admin', adminRoutes); // مسارات لوحة الإدارة (ST-07, ST-09, ST-10)
app.use('/api/messages', messageRoutes); // مسارات نظام الرسائل (ST-08)
app.use('/api/notifications', notificationRoutes); // مسارات الإشعارات (ST-12)

// =======================================================
// 6. مسارات النظام (System Routes)
// =======================================================

// مسار فحص حالة الخادم (Health Check)
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'TauTec Platform API is running',
        timestamp: new Date().toISOString()
    });
});

// توجيه جميع المسارات الأخرى غير المعروفة (Catch-all)
// لعرض ملف index.html الخاص بالـ Frontend (مهم لتطبيقات SPA مثل React/Vue/VanillaJS)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// =======================================================
// 7. معالج الأخطاء (Error Handling)
// =======================================================

// وضع معالج الأخطاء بعد جميع الـ Middlewares والـ Routes
// أي خطأ يتم رميه (throw) سيصل إلى هنا ليتم التعامل معه بشكل موحد.
app.use(errorHandler);

// =======================================================
// 8. بدء الخادم (Start Server) with Socket.IO
// =======================================================

const http = require('http');
const { Server } = require('socket.io');
const { initializeSocket } = require('./src/socket/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:5000'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Initialize socket handlers
initializeSocket(io);

// دالة البدء الرئيسية (تستخدم async/await)
const startServer = async () => {
    // التحقق من اتصال قاعدة البيانات قبل البدء 
    const dbConnected = await testConnection();

    if (!dbConnected) {
        // إذا فشل الاتصال، يتم تسجيل خطأ والخروج من عملية الخادم
        console.error('🛑 Exiting server startup due to database connection failure.');
        process.exit(1);
    }

    // يتم بدء الاستماع فقط إذا كان الاتصال بقاعدة البيانات ناجحاً
    server.listen(PORT, () => {
        console.log(`🚀 TauTec Platform Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🌐 API URL: http://localhost:${PORT}/api`);
        console.log(`🔌 Socket.IO enabled for real-time messaging`);
    });
};

startServer(); // تشغيل عملية بدء الخادم

module.exports = { app, io };
