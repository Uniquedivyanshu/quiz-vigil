# QuizVigil

## Online Quiz Application with Anti-Cheat & Randomization

QuizVigil is a web-based online quiz application designed for colleges and educational institutes to conduct internal tests, unit tests, sessional exams, and other online assessments.

The system provides separate dashboards for Founder, Institute Admin, Teacher, and Student users.

---

## Features

### Founder / Master Admin
- Manage registered institutes
- View institute information
- Activate / deactivate institutes
- Monitor overall institute registration

### Institute Admin
- Manage institute teachers
- Manage institute students
- View registration approvals
- Activate / deactivate users
- Institute-wise data isolation

### Teacher
- Create and manage questions
- Question Bank
- Create quizzes
- Select questions for quizzes
- Set number of questions
- Set quiz duration
- Enable / disable question randomization
- Start and stop quizzes
- View students
- View quiz attempts and results
- Monitor anti-cheat activity
- Delete stopped quizzes

### Student
- Student registration/login
- View available quizzes
- Start quiz attempts
- Randomized questions when enabled
- Countdown timer
- Save answers
- Submit quiz
- Automatic submission when time expires
- View score and percentage
- View correct, wrong, and unattempted questions
- View previous attempts

---

## Quiz Randomization

QuizVigil supports question randomization.

For example:

- Selected questions: 3
- Number of questions: 1
- Randomization: ON

A student can receive any 1 question from the selected pool.

If randomization is OFF, questions follow their selected order.

When all selected questions are used, randomization changes their order rather than removing questions.

The selected question set/order is stored for the live quiz so that the attempt system can use the same active question set.

---

## Timer & Attempt System

Each quiz can have a configured duration.

During an attempt:

- The server tracks the attempt start time.
- The remaining time is calculated from the configured quiz duration.
- Answers can be saved during the attempt.
- When time expires, the attempt can be automatically submitted.
- Server-side validation prevents an expired attempt from being submitted as a normal active attempt.

Existing attempts are allowed to finish even when a teacher stops the quiz.

Stopping a quiz prevents new attempts from starting but does not forcibly terminate an already-running student attempt.

---

## Anti-Cheat Monitoring

QuizVigil includes browser-based anti-cheat monitoring.

The system can record events such as:

- Tab switch
- Window focus loss
- Fullscreen exit
- Copy attempt
- Other suspicious browser activity

These events are stored with the student's quiz attempt and can be reviewed by the teacher.

> Browser-based anti-cheat monitoring is intended to detect and record suspicious activity. It cannot guarantee complete prevention of cheating on a student's device.

---

## Result System

After submission, QuizVigil calculates:

- Total questions
- Total marks
- Correct answers
- Wrong answers
- Unattempted questions
- Score
- Percentage
- Attempt ID
- Start time
- Submission time
- Anti-cheat activity

Results are stored in the backend database and can be viewed from the Teacher dashboard.

---

## User Roles

| Role | Main Responsibility |
|------|---------------------|
| Founder | Overall institute management |
| Institute Admin | Manage institute users and approvals |
| Teacher | Manage questions, quizzes, students and results |
| Student | Attempt quizzes and view results |

---

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL
- Neon PostgreSQL

### Development / Version Control
- Git
- GitHub
- StackBlitz

---

## Project Structure

```text
quiz-vigil/
│
├── backend/
│   └── src/
│       ├── config/
│       │   └── db.js
│       │
│       ├── controllers/
│       │   ├── attemptController.js
│       │   ├── quizController.js
│       │   ├── studentController.js
│       │   └── userController.js
│       │
│       ├── routes/
│       │   ├── attemptRoutes.js
│       │   ├── quizRoutes.js
│       │   ├── studentRoutes.js
│       │   └── userRoutes.js
│       │
│       └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
---

## Database

QuizVigil uses PostgreSQL through Neon.

The database stores information related to:

- Users
- Students
- Teachers
- Questions
- Quizzes
- Quiz-question mappings
- Attempts
- Answers
- Results
- Anti-cheat activity
- Institute information

The application uses institute codes to keep institute-specific data separated.

---

## Backend API

The backend provides REST API endpoints for the main application functionality.

Examples:

```text
GET    /api/health
GET    /api/students
GET    /api/users
PATCH  /api/users/:id/status
GET    /api/quizzes
POST   /api/quizzes
POST   /api/quizzes/:id/start
POST   /api/quizzes/:id/stop
DELETE /api/quizzes/:id
POST   /api/attempts/start
POST   /api/attempts/:id/answers
POST   /api/attempts/:id/submit
GET    /api/attempts/results

The exact available routes may change as the project develops.

---

## Database Connection Check

QuizVigil provides a health endpoint:

GET /api/health

A successful response confirms that the API server and PostgreSQL database are connected.

Example:

{
  "success": true,
  "message": "QuizVigil API and PostgreSQL database are connected",
  "database": "connected"
}

---

## Local Development

1. Clone the repository

git clone https://github.com/<YOUR-GITHUB-USERNAME>/quiz-vigil.git
cd quiz-vigil

2. Install dependencies

For the frontend:

npm install

For the backend:

cd backend
npm install

3. Configure environment variables

Create the required environment configuration for the backend.

Example:

DATABASE_URL=your_neon_database_connection_string
PORT=5000

Do not commit .env files or database credentials to GitHub.

4. Start the backend

cd backend
npm run dev

5. Start the frontend

From the frontend project directory:

npm run dev

---

## Environment Variables

Sensitive configuration should be stored in environment variables.

Example:

DATABASE_URL=
PORT=5000

Never publish:

- Database passwords
- Neon connection strings
- API secrets
- Authentication secrets
- Private credentials 

---

## Security Notes

QuizVigil currently uses institute-based data separation throughout the main application flow.

Teacher and institute-specific operations use identifiers such as:

- Teacher ID
- Institute Code

The application should continue to be tested and hardened before being used for production-level examinations.

---

## Testing

The following application flows have been tested:

### Founder

- Institute registration
- Institute listing
- Institute activation/deactivation

### Institute Admin

- Teacher management
- Student management
- Registration approvals
- User activation/deactivation
- Institute-wise data

### Teacher

- Question Bank
- Quiz creation
- Quiz start
- Quiz stop
- Quiz deletion
- Student listing
- Result viewing
- Anti-cheat monitoring

### Student

- Quiz availability
- Quiz start
- Question loading
- Timer
- Answer saving
- Quiz submission
- Result calculation
- Attempt history

### Backend

- API health check
- Neon PostgreSQL connection
- Database-backed student data
- Database-backed user data
- Database-backed quiz data
- Database-backed attempt/result data

---

## GitHub

The project is maintained using Git and GitHub.

The `.gitignore` file prevents unnecessary files such as `node_modules`, `.env`, and build output from being committed.

---

## Project Status

QuizVigil currently contains the main working flow:

```text
Founder
   ↓
Institute Admin
   ↓
Teacher
   ↓
Question Bank
   ↓
Quiz Creation
   ↓
Quiz Start / Stop
   ↓
Student Attempt
   ↓
Timer & Answer Saving
   ↓
Anti-Cheat Monitoring
   ↓
Quiz Submission
   ↓
Result & Score

The core application flow has been integrated with the Neon PostgreSQL backend.

---

## Future Improvements

Possible future improvements include:

- Production deployment
- Stronger authentication and authorization
- Additional security hardening
- Production-level anti-cheat controls
- Automated testing
- Performance optimization
- Backup and recovery strategy
- Production monitoring

---

## Author

QuizVigil

College Mini Project

Built for educational institute online assessment and internal testing use.

---