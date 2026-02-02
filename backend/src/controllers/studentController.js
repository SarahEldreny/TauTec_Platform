const { query, queryOne } = require('../config/database');

// Enroll in course
exports.enrollInCourse = async (req, res) => {
    try {
        const { course_id } = req.body;
        const courseId = course_id;
        const student_id = req.user.id;

        // Check if course exists and is published
        const course = await queryOne(
            'SELECT * FROM courses WHERE id = ? AND status = ?',
            [courseId, 'published']
        );

        if (!course) {
            console.log('Course not found for ID:', courseId, 'Status:', 'published');
            return res.status(404).json({
                success: false,
                message: 'Course not found or not available'
            });
        }

        // Check if already enrolled
        const existingEnrollment = await queryOne(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, courseId]
        );

        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'Already enrolled in this course'
            });
        }

        // Create enrollment
        await query(
            'INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, ?)',
            [student_id, courseId, 'active']
        );

        // Update enrollment count
        await query(
            'UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = ?',
            [courseId]
        );

        // Create notification
        await query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [
                student_id,
                'Enrollment Successful',
                `You have successfully enrolled in ${course.title}`,
                'enrollment',
                `/courses/${courseId}`
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Enrolled successfully'
        });
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enroll',
            error: error.message
        });
    }
};

// Get enrolled courses
exports.getEnrolledCourses = async (req, res) => {
    try {
        const student_id = req.user.id;

        const courses = await query(
            `SELECT c.*, e.progress, e.status as enrollment_status, e.enrolled_at,
                    u.first_name as instructor_first_name,
                    u.last_name as instructor_last_name
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             JOIN users u ON c.instructor_id = u.id
             WHERE e.student_id = ?
             ORDER BY e.enrolled_at DESC`,
            [student_id]
        );

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get enrolled courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrolled courses',
            error: error.message
        });
    }
};

// Get course progress
exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const student_id = req.user.id;

        // Get enrollment
        const enrollment = await queryOne(
            'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, courseId]
        );

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Not enrolled in this course'
            });
        }

        // Get total lessons count
        const totalLessons = await queryOne(
            `SELECT COUNT(*) as count 
             FROM lessons l
             JOIN modules m ON l.module_id = m.id
             WHERE m.course_id = ?`,
            [courseId]
        );

        // Get completed lessons count
        const completedLessons = await queryOne(
            `SELECT COUNT(*) as count 
             FROM progress p
             JOIN lessons l ON p.lesson_id = l.id
             JOIN modules m ON l.module_id = m.id
             WHERE m.course_id = ? AND p.student_id = ? AND p.is_completed = TRUE`,
            [courseId, student_id]
        );

        // Get detailed progress by lesson
        const lessonsProgress = await query(
            `SELECT l.id, l.title, l.lesson_type, l.duration,
                    m.title as module_title,
                    p.is_completed, p.time_spent, p.last_accessed
             FROM lessons l
             JOIN modules m ON l.module_id = m.id
             LEFT JOIN progress p ON l.id = p.lesson_id AND p.student_id = ?
             WHERE m.course_id = ?
             ORDER BY m.order_index, l.order_index`,
            [student_id, courseId]
        );

        const progressPercentage = totalLessons.count > 0
            ? Math.round((completedLessons.count / totalLessons.count) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                enrollment,
                totalLessons: totalLessons.count,
                completedLessons: completedLessons.count,
                progressPercentage,
                lessons: lessonsProgress
            }
        });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress',
            error: error.message
        });
    }
};

// Mark lesson as complete
exports.completeLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const student_id = req.user.id;
        const { timeSpent } = req.body;

        // Check if progress record exists
        const existingProgress = await queryOne(
            'SELECT * FROM progress WHERE student_id = ? AND lesson_id = ?',
            [student_id, lessonId]
        );

        if (existingProgress) {
            // Update existing
            await query(
                `UPDATE progress 
                 SET is_completed = TRUE, time_spent = ?, completed_at = NOW()
                 WHERE student_id = ? AND lesson_id = ?`,
                [timeSpent || 0, student_id, lessonId]
            );
        } else {
            // Create new
            await query(
                `INSERT INTO progress 
                 (student_id, lesson_id, is_completed, time_spent, completed_at)
                 VALUES (?, ?, TRUE, ?, NOW())`,
                [student_id, lessonId, timeSpent || 0]
            );
        }

        // Update overall course progress
        const lesson = await queryOne(
            'SELECT m.course_id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE l.id = ?',
            [lessonId]
        );

        if (lesson) {
            const totalLessons = await queryOne(
                `SELECT COUNT(*) as count FROM lessons l
                 JOIN modules m ON l.module_id = m.id
                 WHERE m.course_id = ?`,
                [lesson.course_id]
            );

            const completedLessons = await queryOne(
                `SELECT COUNT(*) as count FROM progress p
                 JOIN lessons l ON p.lesson_id = l.id
                 JOIN modules m ON l.module_id = m.id
                 WHERE m.course_id = ? AND p.student_id = ? AND p.is_completed = TRUE`,
                [lesson.course_id, student_id]
            );

            const progressPercentage = (completedLessons.count / totalLessons.count) * 100;

            await query(
                'UPDATE enrollments SET progress = ? WHERE student_id = ? AND course_id = ?',
                [progressPercentage, student_id, lesson.course_id]
            );

            // Check if course is completed
            if (progressPercentage === 100) {
                await query(
                    `UPDATE enrollments 
                     SET status = 'completed', completed_at = NOW()
                     WHERE student_id = ? AND course_id = ?`,
                    [student_id, lesson.course_id]
                );

                // Create completion notification
                const course = await queryOne('SELECT title FROM courses WHERE id = ?', [lesson.course_id]);
                await query(
                    `INSERT INTO notifications (user_id, title, message, type)
                     VALUES (?, ?, ?, ?)`,
                    [student_id, 'Course Completed!', `Congratulations! You completed ${course.title}`, 'achievement']
                );
            }
        }

        res.json({
            success: true,
            message: 'Lesson marked as complete'
        });
    } catch (error) {
        console.error('Complete lesson error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark lesson as complete',
            error: error.message
        });
    }
};

// Get lesson content for student
exports.getLessonContent = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const student_id = req.user.id;

        const lesson = await queryOne(
            `SELECT l.id, l.title, l.content, l.lesson_type, l.duration, l.video_url, l.is_free,
                    m.id as module_id, m.title as module_title, m.course_id,
                    c.title as course_title
             FROM lessons l
             JOIN modules m ON l.module_id = m.id
             JOIN courses c ON m.course_id = c.id
             WHERE l.id = ?`,
            [lessonId]
        );

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }

        const enrollment = await queryOne(
            'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, lesson.course_id]
        );

        if ((!enrollment || enrollment.status === 'dropped') && !lesson.is_free) {
            return res.status(403).json({
                success: false,
                message: 'Not enrolled in this course'
            });
        }

        const materials = await query(
            `SELECT id, title, file_name, file_path, file_type, file_size, created_at
             FROM materials
             WHERE lesson_id = ?
             ORDER BY created_at DESC`,
            [lessonId]
        );

        res.json({
            success: true,
            data: {
                lesson,
                materials
            }
        });
    } catch (error) {
        console.error('Get lesson content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lesson content',
            error: error.message
        });
    }
};

// Submit assignment
exports.submitAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const student_id = req.user.id;
        const { submissionText, submission_text, link, filePath } = req.body;

        // Check if assignment exists
        const assignment = await queryOne(
            'SELECT * FROM assignments WHERE id = ?',
            [assignmentId]
        );

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Check if already submitted
        const existingSubmission = await queryOne(
            'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
            [assignmentId, student_id]
        );

        if (existingSubmission) {
            return res.status(400).json({
                success: false,
                message: 'Assignment already submitted'
            });
        }

        // Check deadline
        const now = new Date();
        const dueDate = new Date(assignment.due_date);
        const isLate = now > dueDate;

        const text = (submission_text || submissionText || '').trim();
        const linkValue = (link || '').trim();
        const fileName = req.file ? req.file.filename : (filePath || null);

        if (!text && !linkValue && !fileName) {
            return res.status(400).json({
                success: false,
                message: 'Submission text, link, or file is required'
            });
        }

        const finalText = linkValue
            ? `${text ? text + '\n' : ''}Link: ${linkValue}`
            : text || null;

        await query(
            `INSERT INTO submissions 
             (assignment_id, student_id, submission_text, file_path, status)
             VALUES (?, ?, ?, ?, ?)`,
            [assignmentId, student_id, finalText, fileName, isLate ? 'late' : 'submitted']
        );

        res.status(201).json({
            success: true,
            message: isLate ? 'Assignment submitted (Late)' : 'Assignment submitted successfully'
        });
    } catch (error) {
        console.error('Submit assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit assignment',
            error: error.message
        });
    }
};

// Get assignments for student
exports.getStudentAssignments = async (req, res) => {
    try {
        const student_id = req.user.id;

        const assignments = await query(
            `SELECT a.*, c.title as course_title,
                    s.id as submission_id, s.status as submission_status,
                    s.score, s.feedback, s.submitted_at
             FROM assignments a
             JOIN courses c ON a.course_id = c.id
             JOIN enrollments e ON c.id = e.course_id
             LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
             WHERE e.student_id = ?
             ORDER BY a.due_date ASC`,
            [student_id, student_id]
        );

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

// Get student dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const student_id = req.user.id;

        // Total enrolled courses
        const enrolledCourses = await queryOne(
            'SELECT COUNT(*) as count FROM enrollments WHERE student_id = ? AND status = ?',
            [student_id, 'active']
        );

        // Completed courses
        const completedCourses = await queryOne(
            'SELECT COUNT(*) as count FROM enrollments WHERE student_id = ? AND status = ?',
            [student_id, 'completed']
        );

        // Pending assignments
        const pendingAssignments = await queryOne(
            `SELECT COUNT(*) as count FROM assignments a
             JOIN enrollments e ON a.course_id = e.course_id
             LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
             WHERE e.student_id = ? AND s.id IS NULL`,
            [student_id, student_id]
        );

        // Total learning time
        const learningTime = await queryOne(
            'SELECT SUM(time_spent) as total FROM progress WHERE student_id = ?',
            [student_id]
        );

        res.json({
            success: true,
            data: {
                enrolledCourses: enrolledCourses.count,
                completedCourses: completedCourses.count,
                pendingAssignments: pendingAssignments.count,
                totalLearningTime: learningTime.total || 0
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
};

// Get student schedule (upcoming meetings)
exports.getStudentSchedule = async (req, res) => {
    try {
        const student_id = req.user.id;

        const meetings = await query(
            `SELECT m.*, c.title as course_title, 
                    u.first_name as instructor_first_name, u.last_name as instructor_last_name
             FROM course_meetings m
             JOIN courses c ON m.course_id = c.id
             JOIN users u ON m.instructor_id = u.id
             JOIN enrollments e ON c.id = e.course_id
             WHERE e.student_id = ? 
             AND m.meeting_date >= NOW()
             AND e.status = 'active'
             ORDER BY m.meeting_date ASC`,
            [student_id]
        );

        res.json({
            success: true,
            count: meetings.length,
            data: meetings
        });
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedule',
            error: error.message
        });
    }
};

// =======================================================
// QUIZZES (Student)
// =======================================================

exports.getStudentQuizzes = async (req, res) => {
    try {
        const student_id = req.user.id;
        const { courseId } = req.query;

        let sql = `
            SELECT q.*, c.title as course_title,
                   COUNT(qa.id) as attempts_count,
                   MAX(qa.score) as last_score,
                   MAX(qa.passed) as last_passed
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            JOIN enrollments e ON e.course_id = c.id AND e.student_id = ?
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = ?
            WHERE e.status IN ('active', 'completed')
        `;
        const params = [student_id, student_id];

        if (courseId) {
            sql += ' AND c.id = ?';
            params.push(courseId);
        }

        sql += ' GROUP BY q.id ORDER BY q.created_at DESC';

        const quizzes = await query(sql, params);
        res.json({ success: true, count: quizzes.length, data: quizzes });
    } catch (error) {
        console.error('Get student quizzes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch quizzes', error: error.message });
    }
};

exports.getQuizForAttempt = async (req, res) => {
    try {
        const student_id = req.user.id;
        const quizId = parseInt(req.params.quizId, 10);

        const quiz = await queryOne(`
            SELECT q.*, c.title as course_title
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            WHERE q.id = ?
        `, [quizId]);

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        const enrollment = await queryOne(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status IN (\'active\', \'completed\')',
            [student_id, quiz.course_id]
        );

        if (!enrollment) {
            return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
        }

        const attempts = await queryOne(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?',
            [quizId, student_id]
        );

        const questions = await query(
            `SELECT id, question_text, question_type, options, points, order_index
             FROM questions
             WHERE quiz_id = ?
             ORDER BY order_index ASC, id ASC`,
            [quizId]
        );

        const parseOptions = (raw) => {
            if (!raw) return [];
            if (Array.isArray(raw)) return raw;
            if (typeof raw !== 'string') return [];
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return raw.split(',').map(s => s.trim()).filter(Boolean);
            }
        };

        const sanitized = questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: parseOptions(q.options),
            points: q.points,
            order_index: q.order_index
        }));

        res.json({
            success: true,
            data: {
                quiz: {
                    id: quiz.id,
                    title: quiz.title,
                    description: quiz.description,
                    time_limit: quiz.time_limit,
                    passing_score: quiz.passing_score,
                    max_attempts: quiz.max_attempts,
                    course_id: quiz.course_id,
                    course_title: quiz.course_title
                },
                attempts_count: attempts.count || 0,
                questions: sanitized
            }
        });
    } catch (error) {
        console.error('Get quiz for attempt error:', error);
        res.status(500).json({ success: false, message: 'Failed to load quiz', error: error.message });
    }
};

exports.submitQuizAttempt = async (req, res) => {
    try {
        const student_id = req.user.id;
        const quizId = parseInt(req.params.quizId, 10);
        const { answers } = req.body;

        const quiz = await queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        const enrollment = await queryOne(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status IN (\'active\', \'completed\')',
            [student_id, quiz.course_id]
        );
        if (!enrollment) {
            return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
        }

        const attempts = await queryOne(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?',
            [quizId, student_id]
        );
        if (quiz.max_attempts !== null && attempts.count >= quiz.max_attempts) {
            return res.status(400).json({ success: false, message: 'Maximum attempts reached' });
        }

        const questions = await query(
            `SELECT id, question_text, question_type, options, correct_answer, points
             FROM questions
             WHERE quiz_id = ?`,
            [quizId]
        );

        const answerMap = Array.isArray(answers)
            ? answers.reduce((acc, item) => { acc[item.questionId] = item.answer; return acc; }, {})
            : (answers || {});

        let totalPoints = 0;
        let score = 0;

        for (const q of questions) {
            const points = Number(q.points) || 1;
            totalPoints += points;

            const submitted = (answerMap[q.id] ?? '').toString().trim();
            const correct = (q.correct_answer ?? '').toString().trim();

            if (!submitted) continue;

            if (q.question_type === 'short_answer') {
                if (submitted.toLowerCase() === correct.toLowerCase()) {
                    score += points;
                }
            } else {
                if (submitted.toLowerCase() === correct.toLowerCase()) {
                    score += points;
                }
            }
        }

                const passed = score >= (quiz.passing_score || 0);

        const normalizedScore = Number(score) || 0;
        const normalizedTotal = Number(totalPoints) || 0;

        const result = await query(
            `INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, total_points, passed, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [quizId, student_id, JSON.stringify(answers || {}), normalizedScore, normalizedTotal, passed ? 1 : 0]
        );

        res.json({
            success: true,
            message: 'Quiz submitted successfully',
            data: { attemptId: result.insertId, score, totalPoints, passed }
        });
    } catch (error) {
        console.error('Submit quiz attempt error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit quiz', error: error.message });
    }
};


