const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructorController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');
const upload = require('../config/multer');

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

// Materials (Instructor uploads materials to lessons)
router.post('/materials', upload.single('file'), instructorController.addMaterial);
router.get('/materials/lesson/:lessonId', instructorController.getMaterials);
router.delete('/materials/:materialId', instructorController.deleteMaterial);

// Quizzes (Periodic exams for students)
router.post('/quizzes', instructorController.createQuiz);
router.get('/quizzes', instructorController.getMyQuizzes);
router.post('/quizzes/:quizId/questions', instructorController.addQuizQuestion);
router.get('/quizzes/:quizId/results', instructorController.getQuizResults);

// Meetings (Course meetings scheduled by instructor)
router.post('/meetings', instructorController.scheduleMeeting);
router.get('/meetings', instructorController.getMyMeetings);
router.delete('/meetings/:meetingId', instructorController.cancelMeeting);

module.exports = router;
