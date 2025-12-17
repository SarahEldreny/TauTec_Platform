const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');

// All routes require authentication and student role
router.use(verifyToken);
router.use(authorize('student'));

// Enrollment
router.post('/enroll', studentController.enrollInCourse);
router.get('/enrolled-courses', studentController.getEnrolledCourses);

// Progress tracking
router.get('/courses/:courseId/progress', studentController.getCourseProgress);
router.post('/lessons/:lessonId/complete', studentController.completeLesson);

// Assignments
router.get('/assignments', studentController.getStudentAssignments);
router.post('/assignments/:assignmentId/submit', studentController.submitAssignment);

// Dashboard
router.get('/dashboard/stats', studentController.getDashboardStats);

module.exports = router;