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