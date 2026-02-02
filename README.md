# TauTec Platform

![Status](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)
![License](https://img.shields.io/badge/License-MIT-blue)

**TauTec Platform** is a comprehensive solution that combines an **Educational Learning Management System (LMS)** with a **Client Service Portal**. It allows instructors to manage courses and students to learn, while also providing a streamlined interface for clients to request and track technical projects.

---

## 🚀 Features

### 🎓 Educational Platform (LMS)
*   **Course Management**: Instructors can create, edit, and publish courses with modules and lessons.
*   **Student Enrollment**: Students can browse the catalog, enroll in courses, and track their progress.
*   **Assessment**: Integrated quizzes and assignment submissions.
*   **Multimedia Support**: Video lessons, text content, and file downloads.
---

## 🏗️ Technology Stack

*   **Backend**: Node.js, Express.js
*   **Database**: MySQL
*   **Frontend**: Vanilla HTML5, CSS3, JavaScript
*   **Authentication**: JWT (JSON Web Tokens)
*   **Real-time**: Socket.io

---

## ⚙️ Installation & Setup

Follow these steps to get the project running on your local machine.

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [MySQL](https://www.mysql.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/SarahEldreny/TauTec_Platform.git
cd TauTec_Platform
```

### 2. Database Setup
1.  Open your MySQL client (e.g., Workbench, Command Line).
2.  Run the `database_schema.sql` file located in the root directory to create the database and tables.

### 3. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=tautec_platform
JWT_SECRET=your_jwt_secret_key
```

Start the server:
```bash
npm run dev
# Server will start on http://localhost:3000


## 🤝 Contributing
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/YourFeature`).
5.  Open a Pull Request.
