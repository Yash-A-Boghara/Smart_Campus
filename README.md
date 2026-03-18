# Smart Campus 🎓

A full-stack academic management platform with role-based dashboards, a Google Classroom-style module, leave and complaint management, and cloud file storage — all backed by Supabase.

---

## 🚀 Features

### 🎓 Classroom Module (Google Classroom Clone)
- **Create Classrooms** — Faculty create classrooms with a unique auto-generated 6-character join code, banner colour, subject, section, and room details.
- **Co-Teacher Collaboration** — Any faculty can join another faculty's classroom as a **co-teacher** via the class code. Co-teachers have identical permissions to the owner: post, edit, delete, grade, auto-enroll, and remove students.
- **Join as Student** — Students join classrooms using the unique class code.
- **Stream** — Post Announcements, Assignments, and Study Materials. Edit or delete any post.
- **Classwork Tab** — Grouped view of all Assignments, Materials, and Announcements with quick-access buttons.
- **People Tab** — Shows owner, all co-teachers, and enrolled students. Owner can remove co-teachers; co-teacher can leave; any teacher can remove students.
- **Auto-Enroll** — Bulk-enroll students by selecting a class (e.g., `4CE1`) and optionally a batch (A1/B1/C1/A2/B2/C2) from dynamic dropdowns.
- **Multiple File Uploads** — Attach up to 5 files (images, videos, PDFs, DOCX, PPTX) per post or submission. Max 50 MB per file.
- **File Previews** — Inline modal previewer for images, videos, PDFs, and Office documents (powered by Microsoft Office Online Viewer).
- **Grading System** — Faculty grade submitted assignments with a score and optional feedback. Re-grading supported.
- **File Download** — Every attached file has a direct download button.

### 👥 User Management & Roles
- **Admin Dashboard** — Full CRUD for all users, classrooms, and system data.
- **Smart Auto-Assignment** — When a student is registered, their `class` and `batch` are **automatically computed** from their Enrollment ID:
  - Class derived from admission year, branch, and roll number → e.g., `4CE1`
  - Batch derived from roll number ranges → `A1`, `B1`, `C1`, `A2`, `B2`, `C2`
  - Prevents registering current-year students before June (admissions gate)
  - Prevents registering graduated batches (> 4 years old)
- **Faculty** — Classroom owner/co-teacher, leaf approval, complaint review.
- **Student** — Joins classrooms, submits assignments, files leaves and complaints.
- **Counselor/HOD** — Dedicated panel for reviewing and approving/rejecting student leave applications and complaints.

### 📋 Leave Management
- Students submit leave applications with a reason and date.
- Counselor/Faculty review and approve or reject leaves.
- Full history visible to both student and counselor.

### 📣 Complaint System
- Students submit categorised complaints.
- Faculty/Counselor can update the status (`Open` → `Resolved`).

### 🔐 Authentication
- Role-based login (`Admin`, `Faculty`, `Student`, `Counselor`, etc.)
- Passwords hashed with **bcryptjs** (bcrypt, 10 salt rounds)
- Session stored in `localStorage` on the frontend

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router DOM |
| Styling | Vanilla CSS (no component library) |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage Buckets |
| File Uploads | Multer (memory storage → Supabase) |
| Auth | bcryptjs |
| Config | dotenv |

---

## 📦 Setup & Installation

### Prerequisites
- Node.js ≥ 18
- A Supabase project (free tier works)

---

### 1. Database Setup (Supabase SQL Editor)

Run the migration files in **`backend/database/`** **in this order**:

| # | File | Purpose |
|---|------|---------|
| 1 | `schema.sql` | Core tables: `users`, `leaves`, `complaints`, `assignments` |
| 2 | `classroom_schema.sql` | `classrooms`, `classroom_posts`, `submissions`, `classroom_enrollments` |
| 3 | `add_section_column.sql` | Adds `section` column to `classrooms` |
| 4 | `add_batch_column.sql` | Adds `class` and `batch` columns to `users` |
| 5 | `add_file_support.sql` | Adds `attachments` JSONB column to `classroom_posts` |
| 6 | `multiple_files_support.sql` | Adds `attachments` JSONB column to `submissions` |
| 7 | `faculty_join_migration.sql` | ⭐ New: `faculty_classroom_members` co-teacher table |
| 8 | `create_storage_bucket.sql` | Creates `campus-files` storage bucket with public access |

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
```

Start the server:

```bash
node server.js
# Server runs at http://localhost:5000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

---

## 📂 Project Structure

```
Smart Campus/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Login.jsx               # Role-based login page
│       │   ├── AdminDashboard.jsx      # User & system management
│       │   ├── FacultyDashboard.jsx    # Classroom owner + co-teacher full UI
│       │   ├── StudentDashboard.jsx    # Classroom join + assignment submission
│       │   └── CounselorDashboard.jsx  # Leave & complaint review
│       └── index.css
│
├── backend/
│   ├── server.js                       # Express app entry point
│   ├── config/
│   │   └── supabase.js                 # Supabase client init
│   ├── routes/
│   │   ├── auth.js                     # POST /api/login
│   │   ├── users.js                    # CRUD /api/users + auto class/batch assign
│   │   ├── classrooms.js               # Classroom CRUD + faculty-join + co-teachers
│   │   ├── classroom_posts.js          # Posts CRUD
│   │   ├── submissions.js              # Student submissions + grading
│   │   ├── uploads.js                  # Supabase Storage upload
│   │   ├── leaves.js                   # Leave applications
│   │   └── complaints.js               # Complaint system
│   └── database/                       # SQL migration scripts
│
└── README.md
```

---

## 🔑 Full API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/login` | Authenticate user, returns role + name |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/available-classes` | Unique student class values (for dropdowns) |
| `POST` | `/api/users` | Create user (auto-assigns class & batch for students) |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

### Classrooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/classrooms?faculty_id=X` | Owned + co-teacher classrooms |
| `POST` | `/api/classrooms` | Create classroom |
| `DELETE` | `/api/classrooms/:id` | Delete classroom |
| `POST` | `/api/classrooms/faculty-join` | Join as co-teacher via class code |
| `GET` | `/api/classrooms/:id/co-teachers` | List co-teachers |
| `DELETE` | `/api/classrooms/:id/co-teachers/:facultyId` | Remove/leave co-teacher |
| `GET` | `/api/classrooms/student/:studentId` | Classrooms a student is enrolled in |
| `POST` | `/api/classrooms/join` | Student joins via class code |
| `GET` | `/api/classrooms/:id/people` | Enrolled students (with class & batch) |
| `DELETE` | `/api/classrooms/:id/students/:studentId` | Remove student |
| `POST` | `/api/classrooms/:id/auto-enroll` | Bulk-enroll by class + batch |

### Posts, Submissions & Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/classroom-posts/:classroomId` | All posts in a classroom |
| `POST` | `/api/classroom-posts` | Create post |
| `PUT` | `/api/classroom-posts/:id` | Edit post |
| `DELETE` | `/api/classroom-posts/:id` | Delete post |
| `GET` | `/api/submissions/:postId` | All submissions for a post |
| `GET` | `/api/submissions/:postId/:studentId` | Student's own submission |
| `POST` | `/api/submissions` | Submit assignment |
| `PUT` | `/api/submissions/:id/grade` | Grade a submission |
| `POST` | `/api/upload` | Upload files → Supabase Storage (max 5 × 50 MB) |

### Leaves & Complaints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leaves/:studentId` | Student's leave history |
| `POST` | `/api/leaves` | Submit leave |
| `PUT` | `/api/leaves/:id` | Update leave (approve/reject) |
| `DELETE` | `/api/leaves/:id` | Delete leave |
| `GET` | `/api/complaints/:studentId` | Student's complaints |
| `POST` | `/api/complaints` | File a complaint |
| `PUT` | `/api/complaints/:id` | Update complaint status |
| `DELETE` | `/api/complaints/:id` | Delete complaint |

---

## 🗄️ Database Schema Overview

```
users                       — All users (Student, Faculty, Admin, Counselor...)
classrooms                  — Classrooms owned by faculty
faculty_classroom_members   — Co-teacher memberships (faculty joining other classrooms)
classroom_enrollments       — Students enrolled in classrooms
classroom_posts             — Announcements, Assignments, Materials
submissions                 — Student assignment submissions
leaves                      — Student leave applications
complaints                  — Student complaints
```

---

## 🧠 Smart Logic: Auto Class & Batch Assignment

When a student is registered, their class and batch are computed automatically from their **Enrollment ID** (e.g., `24DCE045`):

| Component | Example | Meaning |
|-----------|---------|---------|
| `24` | Year | Admission year 2024 |
| `D` | Type prefix | Degree |
| `CE` | Branch | Computer Engineering |
| `045` | Roll | Roll number 45 |

**Class**: Based on current year/month → `(currentYear - admissionYear) × 2` semesters, e.g., `4CE1`  
**Batch**: Roll 1–25 → `A1`, 26–50 → `B1`, 51–75 → `C1`, 76–100 → `A2`, 101–125 → `B2`, 126–150 → `C2`

> Registration of a new batch is blocked before **June** of the admission year.
