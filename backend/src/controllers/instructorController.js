const { query, queryOne } = require('../config/database');

// Get instructor dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const instructor_id = req.user.id;

        // Total courses
        const totalCourses = await queryOne(
            'SELECT COUNT(*) as count FROM courses WHERE instructor_id = ?',
            [instructor_id]
        );

        // Published courses
        const publishedCourses = await queryOne(
            'SELECT COUNT(*) as count FROM courses WHERE instructor_id = ? AND status = ?',
            [instructor_id, 'published']
        );

        // Total students (enrolled in instructor's courses)
        const totalStudents = await queryOne(
            `SELECT COUNT(DISTINCT e.student_id) as count 
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE c.instructor_id = ?`,
            [instructor_id]
        );

        // Pending assignments to grade
        const pendingGrading = await queryOne(
            `SELECT COUNT(*) as count 
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.id
             JOIN courses c ON a.course_id = c.id
             WHERE c.instructor_id = ? AND s.status = 'submitted'`,
            [instructor_id]
        );

        // Total revenue (if paid courses)
        const totalRevenue = await queryOne(
            `SELECT SUM(c.price) as total
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE c.instructor_id = ? AND c.price > 0`,
            [instructor_id]
        );

        res.json({
            success: true,
            data: {
                totalCourses: totalCourses.count,
                publishedCourses: publishedCourses.count,
                totalStudents: totalStudents.count,
                pendingGrading: pendingGrading.count,
                totalRevenue: totalRevenue.total || 0
            }
        });
    } catch (error) {
        console.error('Get instructor stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// Get students enrolled in instructor's courses
exports.getMyStudents = async (req, res) => {
    try {
        const instructor_id = req.user.id;
        const { courseId } = req.query;

        let sql = `
            SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.profile_picture,
                   e.enrolled_at, e.progress, c.title as course_title, c.id as course_id
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            JOIN courses c ON e.course_id = c.id
            WHERE c.instructor_id = ?
        `;
        const params = [instructor_id];

        if (courseId) {
            sql += ' AND c.id = ?';
            params.push(courseId);
        }

        sql += ' ORDER BY e.enrolled_at DESC';

        const students = await query(sql, params);

        res.json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
};

// Get course analytics
exports.getCourseAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;
        const instructor_id = req.user.id;

        // Verify ownership
        const course = await queryOne(
            'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructor_id]
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found or access denied'
            });
        }

        // Enrollment stats
        const enrollmentStats = await queryOne(
            `SELECT COUNT(*) as total_enrolled,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                    AVG(progress) as avg_progress
             FROM enrollments WHERE course_id = ?`,
            [courseId]
        );

        // Completion rate by lesson
        const lessonStats = await query(
            `SELECT l.id, l.title, l.lesson_type,
                    COUNT(DISTINCT p.student_id) as completed_by
             FROM lessons l
             JOIN modules m ON l.module_id = m.id
             LEFT JOIN progress p ON l.id = p.lesson_id AND p.is_completed = TRUE
             WHERE m.course_id = ?
             GROUP BY l.id
             ORDER BY m.order_index, l.order_index`,
            [courseId]
        );

        // Assignment stats
        const assignmentStats = await query(
            `SELECT a.id, a.title, a.max_score,
                    COUNT(s.id) as total_submissions,
                    AVG(s.score) as avg_score
             FROM assignments a
             LEFT JOIN submissions s ON a.id = s.assignment_id
             WHERE a.course_id = ?
             GROUP BY a.id`,
            [courseId]
        );

        // Recent activity
        const recentActivity = await query(
            `SELECT 'enrollment' as type, u.first_name, u.last_name, e.enrolled_at as timestamp
             FROM enrollments e
             JOIN users u ON e.student_id = u.id
             WHERE e.course_id = ?
             UNION ALL
             SELECT 'submission' as type, u.first_name, u.last_name, s.submitted_at as timestamp
             FROM submissions s
             JOIN users u ON s.student_id = u.id
             JOIN assignments a ON s.assignment_id = a.id
             WHERE a.course_id = ?
             ORDER BY timestamp DESC LIMIT 10`,
            [courseId, courseId]
        );

        res.json({
            success: true,
            data: {
                course,
                enrollmentStats,
                lessonStats,
                assignmentStats,
                recentActivity
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};

// Grade assignment submission
exports.gradeSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { score, feedback } = req.body;
        const instructor_id = req.user.id;

        // Verify submission belongs to instructor's course
        const submission = await queryOne(
            `SELECT s.*, a.course_id, a.max_score, c.instructor_id
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.id
             JOIN courses c ON a.course_id = c.id
             WHERE s.id = ?`,
            [submissionId]
        );

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        if (submission.instructor_id !== instructor_id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to grade this submission'
            });
        }

        // Validate score
        if (score > submission.max_score) {
            return res.status(400).json({
                success: false,
                message: `Score cannot exceed maximum score of ${submission.max_score}`
            });
        }

        // Update submission
        await query(
            `UPDATE submissions 
             SET score = ?, feedback = ?, status = 'graded', 
                 graded_by = ?, graded_at = NOW()
             WHERE id = ?`,
            [score, feedback, instructor_id, submissionId]
        );

        // Create notification for student
        await query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [
                submission.student_id,
                'Assignment Graded',
                `Your assignment has been graded. Score: ${score}/${submission.max_score}`,
                'grade',
                `/student/submissions/${submissionId}`
            ]
        );

        res.json({
            success: true,
            message: 'Assignment graded successfully'
        });
    } catch (error) {
        console.error('Grade submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grade submission',
            error: error.message
        });
    }
};

// Get submissions for grading
exports.getSubmissionsForGrading = async (req, res) => {
    try {
        const instructor_id = req.user.id;
        const { courseId, status } = req.query;

        let sql = `
            SELECT s.*, a.title as assignment_title, a.max_score,
                   u.first_name, u.last_name, u.email,
                   c.title as course_title
            FROM submissions s
            JOIN assignments a ON s.assignment_id = a.id
            JOIN courses c ON a.course_id = c.id
            JOIN users u ON s.student_id = u.id
            WHERE c.instructor_id = ?
        `;
        const params = [instructor_id];

        if (courseId) {
            sql += ' AND c.id = ?';
            params.push(courseId);
        }

        if (status) {
            sql += ' AND s.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY s.submitted_at DESC';

        const submissions = await query(sql, params);

        res.json({
            success: true,
            count: submissions.length,
            data: submissions
        });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions',
            error: error.message
        });
    }
};

// Create assignment
exports.createAssignment = async (req, res) => {
    try {
        const { courseId, lessonId, title, description, dueDate, maxScore } = req.body;
        const instructor_id = req.user.id;

        // Verify course ownership
        const course = await queryOne(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
            [courseId, instructor_id]
        );

        if (!course) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized or course not found'
            });
        }

        const result = await query(
            `INSERT INTO assignments 
             (course_id, lesson_id, title, description, due_date, max_score, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [courseId, lessonId, title, description, dueDate, maxScore || 100, instructor_id]
        );

        // Notify enrolled students
        const students = await query(
            'SELECT student_id FROM enrollments WHERE course_id = ? AND status = ?',
            [courseId, 'active']
        );

        for (const student of students) {
            await query(
                `INSERT INTO notifications (user_id, title, message, type, link)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    student.student_id,
                    'New Assignment',
                    `New assignment posted: ${title}`,
                    'assignment',
                    `/student/assignments/${result.insertId}`
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: { assignmentId: result.insertId }
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create assignment',
            error: error.message
        });
    }
};

// Get instructor's assignments
exports.getMyAssignments = async (req, res) => {
    try {
        const instructor_id = req.user.id;
        const { courseId } = req.query;

        let sql = `
            SELECT a.*, c.title as course_title,
                   COUNT(s.id) as total_submissions,
                   COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as pending_grading
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            LEFT JOIN submissions s ON a.id = s.assignment_id
            WHERE c.instructor_id = ?
        `;
        const params = [instructor_id];

        if (courseId) {
            sql += ' AND c.id = ?';
            params.push(courseId);
        }

        sql += ' GROUP BY a.id ORDER BY a.created_at DESC';

        const assignments = await query(sql, params);

        res.json({
            success: true,
            count: assignments.length,
            data: assignments
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments',
            error: error.message
        });
    }
};

// ============================================================================
// MATERIALS MANAGEMENT
// ============================================================================

// Add material to a lesson
exports.addMaterial = async (req, res) => {
    try {
        const file = req.file;
        let { lessonId, title, fileName, filePath, fileType, fileSize } = req.body;
        const instructor_id = req.user.id;

        if (file) {
            fileName = file.originalname;
            filePath = `/uploads/${file.filename}`;
            fileType = file.mimetype;
            fileSize = file.size;
            if (!title) {
                title = file.originalname;
            }
        }

        if (!lessonId || !fileName || !filePath) {
            return res.status(400).json({ success: false, message: 'Lesson and file are required' });
        }

        // Verify instructor owns the course that contains this lesson
        const lesson = await queryOne(`
            SELECT l.*, m.course_id, c.instructor_id 
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE l.id = ?
        `, [lessonId]);

        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        if (lesson.instructor_id !== instructor_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const result = await query(`
            INSERT INTO materials (lesson_id, title, file_name, file_path, file_type, file_size, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [lessonId, title, fileName, filePath, fileType, fileSize, instructor_id]);

        res.status(201).json({
            success: true,
            message: 'Material added successfully',
            data: { materialId: result.insertId }
        });
    } catch (error) {
        console.error('Add material error:', error);
        res.status(500).json({ success: false, message: 'Failed to add material', error: error.message });
    }
};

// Get materials for a lesson
exports.getMaterials = async (req, res) => {
    try {
        const { lessonId } = req.params;

        const materials = await query(`
            SELECT m.*, u.first_name, u.last_name 
            FROM materials m
            JOIN users u ON m.uploaded_by = u.id
            WHERE m.lesson_id = ?
            ORDER BY m.created_at DESC
        `, [lessonId]);

        res.json({ success: true, count: materials.length, data: materials });
    } catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch materials', error: error.message });
    }
};

// Delete material
exports.deleteMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const instructor_id = req.user.id;

        const material = await queryOne(`
            SELECT mat.*, c.instructor_id 
            FROM materials mat
            JOIN lessons l ON mat.lesson_id = l.id
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE mat.id = ?
        `, [materialId]);

        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (material.instructor_id !== instructor_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await query('DELETE FROM materials WHERE id = ?', [materialId]);
        res.json({ success: true, message: 'Material deleted successfully' });
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete material', error: error.message });
    }
};

// ============================================================================
// QUIZZES MANAGEMENT
// ============================================================================

// Create quiz
exports.createQuiz = async (req, res) => {
    try {
        const { courseId, lessonId, title, description, timeLimit, passingScore, maxAttempts } = req.body;
        const instructor_id = req.user.id;

        // Verify course ownership
        const course = await queryOne('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [courseId, instructor_id]);

        if (!course && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized or course not found' });
        }

        const result = await query(`
            INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit, passing_score, max_attempts, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [courseId, lessonId, title, description, timeLimit, passingScore || 60, maxAttempts || 3, instructor_id]);

        // Notify enrolled students
        const students = await query('SELECT student_id FROM enrollments WHERE course_id = ? AND status = ?', [courseId, 'active']);

        for (const student of students) {
            await query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (?, ?, ?, ?, ?)
            `, [student.student_id, 'New Quiz Available', `New quiz posted: ${title}`, 'quiz', `/student/quizzes/${result.insertId}`]);
        }

        res.status(201).json({ success: true, message: 'Quiz created successfully', data: { quizId: result.insertId } });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ success: false, message: 'Failed to create quiz', error: error.message });
    }
};

// Get instructor's quizzes
exports.getMyQuizzes = async (req, res) => {
    try {
        const instructor_id = req.user.id;
        const { courseId } = req.query;

        let sql = `
            SELECT q.*, c.title as course_title,
                   COUNT(qa.id) as total_attempts,
                   AVG(qa.score) as avg_score
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
            WHERE c.instructor_id = ?
        `;
        const params = [instructor_id];

        if (courseId) {
            sql += ' AND c.id = ?';
            params.push(courseId);
        }

        sql += ' GROUP BY q.id ORDER BY q.created_at DESC';

        const quizzes = await query(sql, params);
        res.json({ success: true, count: quizzes.length, data: quizzes });
    } catch (error) {
        console.error('Get quizzes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch quizzes', error: error.message });
    }
};

// Add question to quiz
exports.addQuizQuestion = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { questionText, questionType, options, correctAnswer, points, orderIndex } = req.body;
        const instructor_id = req.user.id;

        // Verify quiz ownership
        const quiz = await queryOne(`
            SELECT q.*, c.instructor_id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        if (quiz.instructor_id !== instructor_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const result = await query(`
            INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [quizId, questionText, questionType, JSON.stringify(options), correctAnswer, points || 1, orderIndex]);

        res.status(201).json({ success: true, message: 'Question added successfully', data: { questionId: result.insertId } });
    } catch (error) {
        console.error('Add question error:', error);
        res.status(500).json({ success: false, message: 'Failed to add question', error: error.message });
    }
};

// Get quiz results
exports.getQuizResults = async (req, res) => {
    try {
        const { quizId } = req.params;
        const instructor_id = req.user.id;

        // Verify quiz ownership
        const quiz = await queryOne(`
            SELECT q.*, c.instructor_id FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);

        if (!quiz || (quiz.instructor_id !== instructor_id && req.user.role !== 'admin')) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const results = await query(`
            SELECT qa.*, u.first_name, u.last_name, u.email
            FROM quiz_attempts qa
            JOIN users u ON qa.student_id = u.id
            WHERE qa.quiz_id = ?
            ORDER BY qa.completed_at DESC
        `, [quizId]);

        res.json({ success: true, count: results.length, data: results });
    } catch (error) {
        console.error('Get quiz results error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch results', error: error.message });
    }
};

// ============================================================================
// MEETINGS MANAGEMENT
// ============================================================================

// Schedule meeting
exports.scheduleMeeting = async (req, res) => {
    try {
        const { courseId, title, description, meetingDate, duration, meetingLink, meetingType } = req.body;
        const instructor_id = req.user.id;

        // Verify course ownership
        const course = await queryOne('SELECT * FROM courses WHERE id = ? AND instructor_id = ?', [courseId, instructor_id]);

        if (!course && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized or course not found' });
        }

        const result = await query(`
            INSERT INTO course_meetings (course_id, instructor_id, title, description, meeting_date, duration, meeting_link, meeting_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [courseId, instructor_id, title, description, meetingDate, duration || 60, meetingLink, meetingType || 'online']);

        // Notify enrolled students
        const students = await query('SELECT student_id FROM enrollments WHERE course_id = ? AND status = ?', [courseId, 'active']);

        for (const student of students) {
            await query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (?, ?, ?, ?, ?)
            `, [student.student_id, 'New Meeting Scheduled', `New meeting: ${title} on ${new Date(meetingDate).toLocaleString()}`, 'meeting', `/student/meetings/${result.insertId}`]);
        }

        res.status(201).json({ success: true, message: 'Meeting scheduled successfully', data: { meetingId: result.insertId } });
    } catch (error) {
        console.error('Schedule meeting error:', error);
        res.status(500).json({ success: false, message: 'Failed to schedule meeting', error: error.message });
    }
};

// Get instructor's meetings
exports.getMyMeetings = async (req, res) => {
    try {
        const instructor_id = req.user.id;
        const { courseId, status } = req.query;

        let sql = `
            SELECT m.*, c.title as course_title
            FROM course_meetings m
            JOIN courses c ON m.course_id = c.id
            WHERE m.instructor_id = ?
        `;
        const params = [instructor_id];

        if (courseId) {
            sql += ' AND m.course_id = ?';
            params.push(courseId);
        }

        if (status) {
            sql += ' AND m.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY m.meeting_date DESC';

        const meetings = await query(sql, params);
        res.json({ success: true, count: meetings.length, data: meetings });
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch meetings', error: error.message });
    }
};

// Cancel meeting
exports.cancelMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const instructor_id = req.user.id;

        const meeting = await queryOne('SELECT * FROM course_meetings WHERE id = ?', [meetingId]);

        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        if (meeting.instructor_id !== instructor_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await query('UPDATE course_meetings SET status = ? WHERE id = ?', ['cancelled', meetingId]);

        // Notify enrolled students
        const students = await query('SELECT student_id FROM enrollments WHERE course_id = ? AND status = ?', [meeting.course_id, 'active']);

        for (const student of students) {
            await query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (?, ?, ?, ?, ?)
            `, [student.student_id, 'Meeting Cancelled', `Meeting "${meeting.title}" has been cancelled`, 'meeting', null]);
        }

        res.json({ success: true, message: 'Meeting cancelled successfully' });
    } catch (error) {
        console.error('Cancel meeting error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel meeting', error: error.message });
    }
};
