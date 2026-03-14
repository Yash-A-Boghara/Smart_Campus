# Smart Campus

A comprehensive academic management system featuring role-based dashboards, a Google Classroom-style module, and integrated file management.

## 🚀 Features

### 🎓 Classroom Module (Google Classroom Clone)
- **Faculty Dashboard**: Create classrooms, share a unique class code, and post Announcements, Assignments, and Study Materials.
- **Student Dashboard**: Join classrooms via class code to view streams and submit assigned work.
- **Multiple File Uploads**: Both faculty (creating posts) and students (submitting work) can attach up to 5 files per action.
- **File Previews**: View attached Images, Videos, PDFs, and Office Documents (PPT, DOCX) directly inline within a responsive modal preview, powered by Supabase Storage and Microsoft Office Online Viewer.
- **Grading System**: Faculty can view student submissions, grade them, and provide feedback.

### 👥 User Roles & Access
- **Admin**: Overall system management and user oversight.
- **Faculty**: Classroom creation, content posting, and student evaluation.
- **Student**: Enrollment in classes, assignment submission, and resource access.
- **Counselor/HOD**: Dedicated views for managing student leaves and complaints (integrated into specific dashboard routes).

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Vite
- React Router DOM
- CSS3 (Custom responsive styling without external component libraries)

**Backend:**
- Node.js & Express.js
- Supabase (PostgreSQL Database & Storage Buckets)
- Multer (for handling `multipart/form-data` uploads)
- bcryptjs (for authentication/passwords)

## 📦 Setup & Installation

### Prerequisites
- Node.js installed on your machine
- A Supabase account and project set up

### 1. Database Configuration
1. Run the SQL scripts found in `backend/database/` in your Supabase SQL Editor to set up tables (`schema.sql`, `classroom_schema.sql`, etc.).
2. Execute `backend/database/create_storage_bucket.sql` to initialize the `campus-files` storage bucket and its public access policies for file uploads.

### 2. Backend Setup
```bash
cd backend
npm install
```
Configure your environment variables. Create a `.env` file in the `backend` directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```
Start the backend server:
```bash
npm start
# or npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Start the Vite development server:
```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## 📂 Project Structure

- `/frontend` - React SPA containing views for Admin, Faculty, Student, and Counselor roles.
- `/backend` - Express API handling authentication, classroom data, submissions, and Supabase Storage uploads.
- `/backend/database` - Collection of SQL migrations and schema definitions.
