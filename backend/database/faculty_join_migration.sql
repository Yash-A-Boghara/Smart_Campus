-- ============================================================
-- Smart Campus: Faculty Co-Teacher Membership Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Table: faculty_classroom_members
-- Tracks faculty who have joined another faculty's classroom as a co-teacher
CREATE TABLE IF NOT EXISTS faculty_classroom_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  faculty_id   TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, faculty_id)
);

-- Index for fast lookups by faculty_id
CREATE INDEX IF NOT EXISTS idx_faculty_members_faculty ON faculty_classroom_members(faculty_id);
-- Index for fast lookups by classroom_id
CREATE INDEX IF NOT EXISTS idx_faculty_members_classroom ON faculty_classroom_members(classroom_id);

-- RLS Policy (allow all for service role, same as other tables)
ALTER TABLE faculty_classroom_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service role" ON faculty_classroom_members FOR ALL USING (true);
