# 🚀 TauTec Platform - دليل التشغيل الكامل

## 📋 المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:
- ✅ **Node.js** (v18 أو أحدث) - [تحميل من هنا](https://nodejs.org/)
- ✅ **MySQL** (v8.0 أو أحدث) - [تحميل من هنا](https://dev.mysql.com/downloads/)
- ✅ **Visual Studio Code** - [تحميل من هنا](https://code.visualstudio.com/)
- ✅ **Git** (اختياري) - [تحميل من هنا](https://git-scm.com/)

---

## 📁 هيكل المشروع

```
tautec-platform/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js ✅ (جاهز)
│   │   ├── controllers/
│   │   │   ├── authController.js ✅ (جاهز)
│   │   │   ├── courseController.js ⚠️ (ستنشئه)
│   │   │   ├── studentController.js ⚠️
│   │   │   ├── instructorController.js ⚠️
│   │   │   ├── clientController.js ⚠️
│   │   │   └── adminController.js ⚠️
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js ✅ (جاهز)
│   │   │   └── errorHandler.js ⚠️
│   │   ├── routes/
│   │   │   ├── auth.routes.js ✅ (جاهز)
│   │   │   ├── courses.routes.js ⚠️
│   │   │   ├── students.routes.js ⚠️
│   │   │   ├── instructors.routes.js ⚠️
│   │   │   ├── clients.routes.js ⚠️
│   │   │   ├── admin.routes.js ⚠️
│   │   │   ├── messages.routes.js ⚠️
│   │   │   └── notifications.routes.js ⚠️
│   │   └── services/
│   │       └── emailService.js ⚠️
│   ├── uploads/ (سيُنشأ تلقائياً)
│   ├── .env ✅
│   ├── package.json ✅ (جاهز)
│   └── server.js ✅ (جاهز)
├── frontend/
│   └── public/
│       ├── index.html ⚠️
│       ├── login.html ⚠️
│       ├── register.html ⚠️
│       ├── dashboard.html ⚠️
│       └── css/
│           └── style.css ⚠️
└── database_schema.sql ✅ (جاهز)
```

---

## 🛠️ خطوات التثبيت

### **الخطوة 1: إنشاء المجلدات**

في VS Code، افتح Terminal (Ctrl + `) واكتب:

```bash
# إنشاء المجلد الرئيسي
mkdir tautec-platform
cd tautec-platform

# إنشاء هيكل المجلدات
mkdir -p backend/src/config
mkdir -p backend/src/controllers
mkdir -p backend/src/middleware
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/uploads
mkdir -p frontend/public/css
mkdir -p frontend/public/js
mkdir -p frontend/public/images
```

---

### **الخطوة 2: نسخ الملفات الجاهزة**

انسخ الملفات التالية من الـ Artifacts إلى مجلداتها:

#### 📄 في مجلد `backend/`
1. `package.json` ✅
2. `server.js` ✅
3. `.env` (انسخ من `.env.example` وعدّل القيم) ✅

#### 📄 في مجلد `backend/src/config/`
4. `database.js` ✅

#### 📄 في مجلد `backend/src/middleware/`
5. `auth.middleware.js` ✅

#### 📄 في مجلد `backend/src/controllers/`
6. `authController.js` ✅

#### 📄 في مجلد `backend/src/routes/`
7. `auth.routes.js` ✅

#### 📄 في المجلد الرئيسي
8. `database_schema.sql` ✅

---

### **الخطوة 3: تثبيت الـ Dependencies**

في Terminal:

```bash
cd backend
npm install
```

انتظر حتى يتم تثبيت جميع المكتبات (قد يستغرق 2-3 دقائق).

---

### **الخطوة 4: إعداد قاعدة البيانات MySQL**

#### 4.1 تشغيل MySQL
- افتح **MySQL Workbench** أو **Command Line**
- سجّل دخول كـ root

#### 4.2 تنفيذ السكريبت

```sql
SOURCE /path/to/database_schema.sql;
```

أو انسخ محتوى `database_schema.sql` وألصقه في MySQL Workbench واضغط Execute.

#### 4.3 تحقق من نجاح الإنشاء

```sql
USE tautec_platform;
SHOW TABLES;
```

يجب أن ترى 21 جدول.

---

### **الخطوة 5: تعديل ملف `.env`**

افتح `backend/.env` وعدّل القيم:

```env
PORT=5000
NODE_ENV=development

# ضع بيانات MySQL الخاصة بك
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=كلمة_مرور_MySQL_عندك
DB_NAME=tautec_platform
DB_PORT=3306

# مفتاح JWT (غيّره لأي نص طويل عشوائي)
JWT_SECRET=your_super_secret_jwt_key_12345_change_this
JWT_EXPIRE=7d

# إعدادات البريد (اختياري للاختبار)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**⚠️ مهم**: غيّر `DB_PASSWORD` لكلمة المرور الفعلية لـ MySQL عندك!

---

### **الخطوة 6: إنشاء الملفات المتبقية**

#### 6.1 ملف `errorHandler.js`

أنشئ ملف `backend/src/middleware/errorHandler.js`:

```javascript
module.exports = (err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
```

#### 6.2 إنشاء Routes الفارغة (مؤقتاً)

أنشئ الملفات التالية في `backend/src/routes/`:

**courses.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Courses route working' });
});

module.exports = router;
```

**students.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Students route working' });
});

module.exports = router;
```

**instructors.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Instructors route working' });
});

module.exports = router;
```

**clients.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Clients route working' });
});

module.exports = router;
```

**admin.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Admin route working' });
});

module.exports = router;
```

**messages.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Messages route working' });
});

module.exports = router;
```

**notifications.routes.js:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ success: true, message: 'Notifications route working' });
});

module.exports = router;
```

---

### **الخطوة 7: تشغيل السيرفر 🚀**

في Terminal من مجلد `backend`:

```bash
npm start
```

**أو للتطوير مع Auto-reload:**

```bash
npm run dev
```

يجب أن ترى:
```
🚀 TauTec Platform Server running on port 5000
📊 Environment: development
🌐 API URL: http://localhost:5000/api
✅ MySQL Database connected successfully
```

---

## 🧪 اختبار الـ API

### استخدام Postman أو Thunder Client في VS Code:

#### 1️⃣ **تسجيل مستخدم جديد**

**POST** `http://localhost:5000/api/auth/register`

Body (JSON):
```json
{
  "email": "student@test.com",
  "password": "Student@123",
  "role": "student",
  "first_name": "Ahmed",
  "last_name": "Mohamed",
  "phone": "01012345678"
}
```

#### 2️⃣ **تسجيل الدخول**

**POST** `http://localhost:5000/api/auth/login`

Body (JSON):
```json
{
  "email": "student@test.com",
  "password": "Student@123"
}
```

**النتيجة:** ستحصل على `token` - احتفظ به!

#### 3️⃣ **عرض الملف الشخصي (مع Authentication)**

**GET** `http://localhost:5000/api/auth/profile`

Headers:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🎨 إنشاء Frontend بسيط

### صفحة تسجيل الدخول

أنشئ ملف `frontend/public/login.html`:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسجيل الدخول - TauTec</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            width: 400px;
            max-width: 90%;
        }
        h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #333;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background: #5568d3;
        }
        .message {
            margin-top: 15px;
            padding: 10px;
            border-radius: 5px;
            display: none;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 TauTec Platform</h1>
        <form id="loginForm">
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" id="email" required placeholder="example@email.com">
            </div>
            <div class="form-group">
                <label>كلمة المرور</label>
                <input type="password" id="password" required placeholder="********">
            </div>
            <button type="submit">تسجيل الدخول</button>
            <div id="message" class="message"></div>
        </form>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const message = document.getElementById('message');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    message.className = 'message success';
                    message.textContent = 'تم تسجيل الدخول بنجاح!';
                    message.style.display = 'block';
                    
                    // حفظ التوكن
                    localStorage.setItem('token', data.data.token);
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                    
                    // توجيه للوحة التحكم
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1000);
                } else {
                    message.className = 'message error';
                    message.textContent = data.message || 'خطأ في تسجيل الدخول';
                    message.style.display = 'block';
                }
            } catch (error) {
                message.className = 'message error';
                message.textContent = 'حدث خطأ في الاتصال بالخادم';
                message.style.display = 'block';
            }
        });
    </script>
</body>
</html>
```

---

## 🎯 الخطوات التالية

بعد التأكد من عمل النظام الأساسي:

### المرحلة 2: إضافة Course Management
- `courseController.js`
- Course CRUD operations
- Material upload system

### المرحلة 3: Student Features
- Enrollment system
- Progress tracking
- Assignment submission

### المرحلة 4: Instructor Features
- Course creation wizard
- Student analytics
- Grading system

### المرحلة 5: Client & Projects
- Project request system
- Dataset upload
- Status tracking

### المرحلة 6: Admin Panel
- User management
- System analytics
- Reports generation

---

## 🐛 استكشاف الأخطاء

### مشكلة: Cannot connect to MySQL
✅ **الحل**: تأكد من تشغيل MySQL وصحة بيانات الاتصال في `.env`

### مشكلة: Port 5000 already in use
✅ **الحل**: غيّر PORT في `.env` إلى رقم آخر (مثل 5001)

### مشكلة: JWT_SECRET missing
✅ **الحل**: تأكد من وجود `JWT_SECRET` في ملف `.env`

---

## 📞 المساعدة

إذا واجهت أي مشكلة:
1. تحقق من Console للأخطاء
2. تأكد من تشغيل MySQL
3. راجع ملف `.env`
4. تحقق من أن جميع الـ dependencies مثبتة

---

**✨ مبروك! المشروع جاهز للتشغيل والتطوير!**