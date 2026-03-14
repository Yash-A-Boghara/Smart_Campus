-- ============================================
-- ADD FILE SUPPORT TO CLASSROOM MODULE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add file columns to classroom_posts
ALTER TABLE classroom_posts
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT; -- 'image' | 'video' | 'pdf' | 'document'

-- 2. Add file columns to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 3. Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('classroom_posts', 'submissions')
  AND column_name IN ('file_url', 'file_name', 'file_type')
ORDER BY table_name, column_name;
