const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructorController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');

// All routes require authentication and instructor role
router.use(verifyToken);
router.use(authorize('instructor', 'admin'));

// Dashboard
router.get('/dashboard/stats', instructorController.getDashboardStats);

// Students
router.get('/students', instructorController.getMyStudents);

// Analytics
router.get('/courses/:courseId/analytics', instructorController.getCourseAnalytics);

// Grading
router.get('/submissions', instructorController.getSubmissionsForGrading);
router.post('/submissions/:submissionId/grade', instructorController.gradeSubmission);

// Assignments
router.get('/assignments', instructorController.getMyAssignments);
router.post('/assignments', instructorController.createAssignment);

module.exports = router;