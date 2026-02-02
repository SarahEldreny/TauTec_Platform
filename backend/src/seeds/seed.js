// ============================================================================
// src/seeds/seed.js - Database Seeder for Testing
// Run with: node src/seeds/seed.js
// ============================================================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, testConnection } = require('../config/database');

// ============================================================================
// SEED DATA
// ============================================================================

const users = [
    // Admin
    { email: 'admin@tautec.com', password: 'Admin123!', role: 'admin', first_name: 'Admin', last_name: 'User' },

    // Instructors
    { email: 'instructor1@tautec.com', password: 'Instructor123!', role: 'instructor', first_name: 'Ahmed', last_name: 'Mohamed' },
    { email: 'instructor2@tautec.com', password: 'Instructor123!', role: 'instructor', first_name: 'Sara', last_name: 'Ali' },

    // Students
    { email: 'student1@tautec.com', password: 'Student123!', role: 'student', first_name: 'Omar', last_name: 'Ibrahim' },
    { email: 'student2@tautec.com', password: 'Student123!', role: 'student', first_name: 'Fatima', last_name: 'Hassan' },
    { email: 'student3@tautec.com', password: 'Student123!', role: 'student', first_name: 'Youssef', last_name: 'Khaled' },

    // Clients
    { email: 'client1@company.com', password: 'Client123!', role: 'client', first_name: 'Mohamed', last_name: 'Sayed' },
    { email: 'client2@company.com', password: 'Client123!', role: 'client', first_name: 'Nour', last_name: 'Adel' },
];

const courses = [
    {
        title: 'Introduction to Web Development',
        description: 'Learn HTML, CSS, and JavaScript basics to build modern websites.',
        category: 'Web Development',
        difficulty: 'beginner',
        price: 299.99,
        duration: 20,
        status: 'published',
        modules: [
            {
                title: 'Getting Started with HTML',
                description: 'Learn the fundamentals of HTML',
                order_index: 1,
                lessons: [
                    { title: 'What is HTML?', lesson_type: 'video', duration: 15, order_index: 1, is_free: true },
                    { title: 'HTML Tags and Elements', lesson_type: 'video', duration: 20, order_index: 2, is_free: false },
                    { title: 'HTML Forms', lesson_type: 'video', duration: 25, order_index: 3, is_free: false },
                ]
            },
            {
                title: 'CSS Fundamentals',
                description: 'Style your web pages with CSS',
                order_index: 2,
                lessons: [
                    { title: 'Introduction to CSS', lesson_type: 'video', duration: 15, order_index: 1, is_free: true },
                    { title: 'CSS Selectors', lesson_type: 'video', duration: 20, order_index: 2, is_free: false },
                    { title: 'Flexbox Layout', lesson_type: 'video', duration: 30, order_index: 3, is_free: false },
                ]
            }
        ]
    },
    {
        title: 'Python for Data Science',
        description: 'Master Python programming for data analysis and machine learning.',
        category: 'Data Science',
        difficulty: 'intermediate',
        price: 149.99,
        duration: 40,
        status: 'published',
        modules: [
            {
                title: 'Python Basics',
                description: 'Core Python programming concepts',
                order_index: 1,
                lessons: [
                    { title: 'Variables and Data Types', lesson_type: 'video', duration: 20, order_index: 1, is_free: true },
                    { title: 'Control Flow', lesson_type: 'video', duration: 25, order_index: 2, is_free: false },
                ]
            },
            {
                title: 'Data Analysis with Pandas',
                description: 'Learn to manipulate data with Pandas',
                order_index: 2,
                lessons: [
                    { title: 'Introduction to Pandas', lesson_type: 'video', duration: 30, order_index: 1, is_free: false },
                    { title: 'DataFrames', lesson_type: 'video', duration: 35, order_index: 2, is_free: false },
                ]
            }
        ]
    },
    {
        title: 'Advanced JavaScript',
        description: 'Deep dive into JavaScript ES6+ features and modern development.',
        category: 'Web Development',
        difficulty: 'advanced',
        price: 199.99,
        duration: 35,
        status: 'draft',
        modules: [
            {
                title: 'ES6+ Features',
                description: 'Modern JavaScript syntax',
                order_index: 1,
                lessons: [
                    { title: 'Arrow Functions', lesson_type: 'video', duration: 20, order_index: 1, is_free: true },
                    { title: 'Promises and Async/Await', lesson_type: 'video', duration: 30, order_index: 2, is_free: false },
                ]
            }
        ]
    }
];

const projects = [
    { title: 'E-commerce Website', description: 'Build a modern e-commerce platform with React and Node.js', project_type: 'web_development', category: 'E-commerce', requirements: 'User authentication, product catalog, shopping cart, payment integration', status: 'submitted' },
    { title: 'Mobile App for Fitness', description: 'iOS and Android fitness tracking application', project_type: 'mobile_app', category: 'Health & Fitness', requirements: 'Activity tracking, workout plans, progress charts, notifications', status: 'submitted' },
    { title: 'Data Analytics Dashboard', description: 'Business intelligence dashboard for sales data', project_type: 'data_analysis', category: 'Business', requirements: 'Real-time data visualization, export reports, KPI tracking', status: 'submitted' },
];

const assignments = [
    { title: 'Build a Personal Portfolio', description: 'Create a responsive portfolio website using HTML and CSS', due_date: '2025-01-15', max_score: 100 },
    { title: 'Python Data Analysis Project', description: 'Analyze a dataset using Pandas and create visualizations', due_date: '2025-01-20', max_score: 100 },
];

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function clearDatabase() {
    console.log('🗑️  Clearing existing data...');

    // Delete in order to respect foreign keys
    await query('DELETE FROM submissions');
    await query('DELETE FROM assignments');
    await query('DELETE FROM lessons');
    await query('DELETE FROM modules');
    await query('DELETE FROM enrollments');
    await query('DELETE FROM project_feedback');
    await query('DELETE FROM projects');
    await query('DELETE FROM messages');
    await query('DELETE FROM notifications');
    await query('DELETE FROM courses');
    await query('DELETE FROM users');

    console.log('✅ Database cleared!');
}

async function seedUsers() {
    console.log('👤 Seeding users...');
    const createdUsers = [];

    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const result = await query(
            `INSERT INTO users (email, password, role, first_name, last_name, is_verified, is_active) 
             VALUES (?, ?, ?, ?, ?, TRUE, TRUE)`,
            [user.email, hashedPassword, user.role, user.first_name, user.last_name]
        );
        createdUsers.push({ ...user, id: result.insertId });
        console.log(`   ✓ Created ${user.role}: ${user.email}`);
    }

    console.log(`✅ Created ${createdUsers.length} users!`);
    return createdUsers;
}

async function seedCourses(createdUsers) {
    console.log('📚 Seeding courses...');
    const instructors = createdUsers.filter(u => u.role === 'instructor');
    const createdCourses = [];

    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        const instructor = instructors[i % instructors.length];

        const courseResult = await query(
            `INSERT INTO courses (instructor_id, title, description, category, difficulty, price, duration, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [instructor.id, course.title, course.description, course.category, course.difficulty, course.price, course.duration, course.status]
        );
        const courseId = courseResult.insertId;
        createdCourses.push({ ...course, id: courseId, instructor_id: instructor.id });
        console.log(`   ✓ Created course: ${course.title} (${course.status})`);

        // Create modules and lessons
        for (const module of course.modules) {
            const moduleResult = await query(
                `INSERT INTO modules (course_id, title, description, order_index)
                 VALUES (?, ?, ?, ?)`,
                [courseId, module.title, module.description, module.order_index]
            );
            const moduleId = moduleResult.insertId;

            for (const lesson of module.lessons) {
                await query(
                    `INSERT INTO lessons (module_id, title, lesson_type, duration, order_index, is_free)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [moduleId, lesson.title, lesson.lesson_type, lesson.duration, lesson.order_index, lesson.is_free]
                );
            }
        }
    }

    console.log(`✅ Created ${createdCourses.length} courses with modules and lessons!`);
    return createdCourses;
}

async function seedEnrollments(createdUsers, createdCourses) {
    console.log('📝 Seeding enrollments...');
    const students = createdUsers.filter(u => u.role === 'student');
    const publishedCourses = createdCourses.filter(c => c.status === 'published');
    let count = 0;

    for (const student of students) {
        // Enroll each student in 1-2 courses
        const coursesToEnroll = publishedCourses.slice(0, Math.floor(Math.random() * 2) + 1);
        for (const course of coursesToEnroll) {
            await query(
                `INSERT INTO enrollments (student_id, course_id, status)
                 VALUES (?, ?, 'active')`,
                [student.id, course.id]
            );
            count++;
        }
    }

    console.log(`✅ Created ${count} enrollments!`);
}

async function seedProjects(createdUsers) {
    console.log('🏗️  Seeding projects...');
    const clients = createdUsers.filter(u => u.role === 'client');
    const instructors = createdUsers.filter(u => u.role === 'instructor');
    const createdProjects = [];

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const client = clients[i % clients.length];
        const instructor = instructors[i % instructors.length];

        const result = await query(
            `INSERT INTO projects (client_id, title, description, project_type, category, requirements, status, assigned_to)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [client.id, project.title, project.description, project.project_type, project.category, project.requirements, project.status, project.status !== 'submitted' ? instructor.id : null]
        );
        createdProjects.push({ ...project, id: result.insertId, client_id: client.id });
        console.log(`   ✓ Created project: ${project.title} (${project.status})`);
    }

    console.log(`✅ Created ${createdProjects.length} projects!`);
    return createdProjects;
}

async function seedAssignments(createdCourses) {
    console.log('📋 Seeding assignments...');
    const publishedCourses = createdCourses.filter(c => c.status === 'published');
    const createdAssignments = [];

    for (let i = 0; i < assignments.length && i < publishedCourses.length; i++) {
        const assignment = assignments[i];
        const course = publishedCourses[i];

        const result = await query(
            `INSERT INTO assignments (course_id, title, description, due_date, max_score, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [course.id, assignment.title, assignment.description, assignment.due_date, assignment.max_score, course.instructor_id]
        );
        createdAssignments.push({ ...assignment, id: result.insertId, course_id: course.id });
        console.log(`   ✓ Created assignment: ${assignment.title}`);
    }

    console.log(`✅ Created ${createdAssignments.length} assignments!`);
    return createdAssignments;
}

async function seedMessages(createdUsers) {
    console.log('💬 Seeding messages...');
    const admin = createdUsers.find(u => u.role === 'admin');
    const students = createdUsers.filter(u => u.role === 'student');

    const messages = [
        { from: students[0], to: admin, content: 'Hello Admin, I have a question about course enrollment.' },
        { from: admin, to: students[0], content: 'Hi! I am happy to help. What would you like to know?' },
        { from: students[1], to: admin, content: 'Can I get a certificate after completing a course?' },
    ];

    for (const msg of messages) {
        await query(
            `INSERT INTO messages (sender_id, receiver_id, content, is_read)
             VALUES (?, ?, ?, FALSE)`,
            [msg.from.id, msg.to.id, msg.content]
        );
    }

    console.log(`✅ Created ${messages.length} messages!`);
}

async function seedNotifications(createdUsers) {
    console.log('🔔 Seeding notifications...');
    const students = createdUsers.filter(u => u.role === 'student');

    const notifications = [
        { title: 'Welcome to TauTec!', message: 'Start exploring our courses today.', type: 'general' },
        { title: 'New Course Available', message: 'Check out our new Python for Data Science course!', type: 'course' },
    ];

    for (const student of students) {
        for (const notif of notifications) {
            await query(
                `INSERT INTO notifications (user_id, title, message, type, is_read)
                 VALUES (?, ?, ?, ?, FALSE)`,
                [student.id, notif.title, notif.message, notif.type]
            );
        }
    }

    console.log(`✅ Created notifications for all students!`);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seed() {
    console.log('\n🌱 Starting database seed...\n');
    console.log('='.repeat(50));

    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Cannot connect to database. Aborting seed.');
            process.exit(1);
        }

        // Clear and seed
        await clearDatabase();
        console.log('');

        const createdUsers = await seedUsers();
        console.log('');

        const createdCourses = await seedCourses(createdUsers);
        console.log('');

        await seedEnrollments(createdUsers, createdCourses);
        console.log('');

        await seedProjects(createdUsers);
        console.log('');

        await seedAssignments(createdCourses);
        console.log('');

        // Skip messages - uses complex conversation system
        // await seedMessages(createdUsers);
        // console.log('');

        // Skip notifications - may need schema check
        // await seedNotifications(createdUsers);
        // console.log('');

        console.log('='.repeat(50));
        console.log('\n🎉 Database seeded successfully!\n');

        console.log('📋 TEST ACCOUNTS:');
        console.log('-'.repeat(50));
        console.log('Admin:      admin@tautec.com / Admin123!');
        console.log('Instructor: instructor1@tautec.com / Instructor123!');
        console.log('Student:    student1@tautec.com / Student123!');
        console.log('Client:     client1@company.com / Client123!');
        console.log('-'.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seed failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run seed
seed();
