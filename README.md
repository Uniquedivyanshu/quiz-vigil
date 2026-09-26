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
├── src/
│   ├── components/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
│
├── public/
│
├── .gitignore
├── package.json
└── README.md