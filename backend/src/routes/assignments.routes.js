// ============================================================================
// src/routes/assignments.routes.js - Assignment Routes
// المسارات الخاصة بالواجبات
// ============================================================================

const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { verifyToken } = require('../middleware/auth.middleware');
const upload = require('../config/multer');

// ============= PUBLIC ROUTES =============

// جلب واجبات دورة معينة (للطلاب والمدرسين)
router.get('/course/:courseId', assignmentController.getAssignmentsByCourse);

// جلب تفاصيل واجب معين
router.get('/:assignmentId', assignmentController.getAssignmentDetails);

// ============= INSTRUCTOR ROUTES =============

// إنشاء واجب جديد
router.post('/', verifyToken, assignmentController.createAssignment);

// جلب واجبات المدرس
router.get('/instructor/assignments/all', verifyToken, assignmentController.getInstructorAssignments);

// تحديث واجب
router.put('/:assignmentId', verifyToken, assignmentController.updateAssignment);

// حذف واجب
router.delete('/:assignmentId', verifyToken, assignmentController.deleteAssignment);

// جلب تسليمات واجب معين
router.get('/:assignmentId/submissions', verifyToken, assignmentController.getSubmissions);

// جلب التسليمات التي لم يتم تقييمها
router.get('/:assignmentId/submissions/ungraded/list', verifyToken, assignmentController.getUngradedSubmissions);

// تقييم تسليم
router.put('/submissions/:submissionId/grade', verifyToken, assignmentController.gradeSubmission);

// جلب إحصائيات الواجب
router.get('/:assignmentId/stats', verifyToken, assignmentController.getAssignmentStats);

// ============= STUDENT ROUTES =============

// تقديم واجب
router.post('/:assignmentId/submit', verifyToken, upload.single('file'), assignmentController.submitAssignment);

// جلب درجات الطالب في دورة معينة
router.get('/course/:courseId/student/grades', verifyToken, assignmentController.getStudentGrades);

module.exports = router;
