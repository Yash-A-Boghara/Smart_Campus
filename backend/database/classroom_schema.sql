-- ============================================
-- Smart Campus: Classroom Module Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  section TEXT,
  room TEXT,
  class_code TEXT UNIQUE NOT NULL,
  faculty_id TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  banner_color TEXT DEFAULT '#1a73e8',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLASSROOM POSTS (announcements, assignments, materials)
CREATE TABLE IF NOT EXISTS classroom_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Announcement', 'Assignment', 'Material')),
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 0,
  due_date TEXT,
  faculty_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STUDENT SUBMISSIONS
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES classroom_posts(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Graded')),
  grade INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLASSROOM ENROLLMENTS
CREATE TABLE IF NOT EXISTS classroom_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, student_id)
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_classrooms_faculty ON classrooms(faculty_id);
CREATE INDEX IF NOT EXISTS idx_posts_classroom ON classroom_posts(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_post ON submissions(post_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON classroom_enrollments(student_id);

-- 6. RLS Policies
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role" ON classrooms FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON classroom_posts FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON submissions FOR ALL USING (true);
CREATE POLICY "Enable all for service role" ON classroom_enrollments FOR ALL USING (true);
