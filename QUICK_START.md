# 🚀 TauTec Platform - دليل التشغيل السريع

## ⚡ خطوات سريعة للتشغيل في 10 دقائق

### 1️⃣ إنشاء المشروع

```bash
# في أي مكان على جهازك
mkdir tautec-platform
cd tautec-platform

# إنشاء المجلدات
mkdir -p backend/src/config backend/src/controllers backend/src/middleware backend/src/routes backend/uploads
mkdir -p frontend/public/css frontend/public/js
```

---

### 2️⃣ نسخ الملفات من Artifacts

**انسخ الملفات بهذا الترتيب:**

```
📁 tautec-platform/
├── backend/
│   ├── package.json                        ← من Artifact #1
│   ├── .env                                ← من Artifact #2 (عدّل القيم!)
│   ├── server.js                           ← من Artifact #4
│   └── src/
│       ├── config/
│       │   └── database.js                 ← من Artifact #5
│       ├── middleware/
│       │   └── auth.middleware.js          ← من Artifact #6
│       ├── controllers/
│       │   └── authController.js           ← من Artifact #7
│       └── routes/
│           └── auth.routes.js              ← من Artifact #8
└── database_schema.sql                     ← من Artifact #3
```

---

### 3️⃣ تثبيت المكتبات

```bash
cd backend
npm install
```

**⏱️ سيستغرق 2-3 دقائق**

---

### 4️⃣ إعداد MySQL

#### في MySQL Workbench:
1. افتح البرنامج
2. سجّل دخول كـ `root`
3. اذهب لـ File → Open SQL Script
4. اختر `database_schema.sql`
5. اضغط Execute (⚡ icon)

#### أو في Terminal:
```bash
mysql -u root -p < ../database_schema.sql
```

#### التحقق:
```sql
USE tautec_platform;
SHOW TABLES;
```
يجب أن ترى 21 جدول ✅

---

### 5️⃣ تعديل .env

افتح `backend/.env` وغيّر هذه القيم:

```env
DB_PASSWORD=كلمة_مرور_MySQL_عندك_هنا

JWT_SECRET=any_long_random_string_12345
```

**⚠️ مهم جداً:** لا تنسى تغيير `DB_PASSWORD`!

---

### 6️⃣ إنشاء ملف errorHandler.js

أنشئ ملف `backend/src/middleware/errorHandler.js`:

```javascript
module.exports = (err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
};
```

---

### 7️⃣ إنشاء Routes الفارغة

أنشئ هذه الملفات في `backend/src/routes/`:

#### courses.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Courses route' });
});
module.exports = router;
```

#### students.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Students route' });
});
module.exports = router;
```

#### instructors.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Instructors route' });
});
module.exports = router;
```

#### clients.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Clients route' });
});
module.exports = router;
```

#### admin.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Admin route' });
});
module.exports = router;
```

#### messages.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Messages route' });
});
module.exports = router;
```

#### notifications.routes.js
```javascript
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.json({ success: true, message: 'Notifications route' });
});
module.exports = router;
```

---

### 8️⃣ تشغيل المشروع 🎉

```bash
# في مجلد backend
npm start
```

**يجب أن ترى:**
```
🚀 TauTec Platform Server running on port 5000
📊 Environment: development
🌐 API URL: http://localhost:5000/api
✅ MySQL Database connected successfully
```

---

## 🧪 اختبار سريع

### في VS Code، ثبّت Extension: Thunder Client

#### 1. تسجيل مستخدم

**POST** `http://localhost:5000/api/auth/register`

Body:
```json
{
  "email": "test@tautec.com",
  "password": "Test@123",
  "role": "student",
  "first_name": "أحمد",
  "last_name": "محمد"
}
```

#### 2. تسجيل دخول

**POST** `http://localhost:5000/api/auth/login`

Body:
```json
{
  "email": "test@tautec.com",
  "password": "Test@123"
}
```

**احفظ الـ token** من النتيجة!

#### 3. عرض Profile

**GET** `http://localhost:5000/api/auth/profile`

Headers:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## ✅ Checklist

- [ ] MySQL يعمل
- [ ] قاعدة البيانات تم إنشاؤها
- [ ] تم تثبيت npm packages
- [ ] ملف .env معدّل
- [ ] السيرفر يعمل بنجاح
- [ ] API يستجيب للطلبات

---

## 🎯 الخطوة التالية

بعد نجاح التشغيل، يمكنك:

1. **إضافة Course Management System**
2. **بناء صفحات Frontend**
3. **إضافة Enrollment System**
4. **تطوير Instructor Dashboard**
5. **إضافة Project Management**

**أخبرني أي جزء تريد تطويره أولاً!** 🚀

---

## 🆘 مشاكل شائعة

| المشكلة | الحل |
|---------|------|
| Error: connect ECONNREFUSED | تأكد من تشغيل MySQL |
| Port 5000 in use | غيّر PORT في .env |
| Cannot find module | شغّل `npm install` مرة أخرى |
| Invalid password | راجع DB_PASSWORD في .env |

---

**🎊 مبروك! المشروع شغال!**