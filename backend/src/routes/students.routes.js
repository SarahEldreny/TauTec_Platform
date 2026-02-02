const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');
const upload = require('../config/multer');

// All routes require authentication and student role
router.use(verifyToken);
router.use(authorize('student'));

// Enrollment
router.post('/enroll', studentController.enrollInCourse);
router.get('/enrollments', studentController.getEnrolledCourses); // Alias for frontend
router.get('/enrolled-courses', studentController.getEnrolledCourses);

// Progress tracking
router.get('/courses/:courseId/progress', studentController.getCourseProgress);
router.get('/lessons/:lessonId', studentController.getLessonContent);
router.post('/lessons/:lessonId/complete', studentController.completeLesson);

// Assignments
router.get('/assignments', studentController.getStudentAssignments);
router.post('/assignments/:assignmentId/submit', upload.single('file'), studentController.submitAssignment);

// Schedule
router.get('/schedule', studentController.getStudentSchedule);

// Dashboard
router.get('/dashboard/stats', studentController.getDashboardStats);

// Quizzes
router.get('/quizzes', studentController.getStudentQuizzes);
router.get('/quizzes/:quizId', studentController.getQuizForAttempt);
router.post('/quizzes/:quizId/attempt', studentController.submitQuizAttempt);

module.exports = router;

