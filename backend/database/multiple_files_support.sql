-- ============================================
-- UPDATE FILES TO SUPPORT JSONB ARRAY
-- ============================================

-- We'll drop the single file columns and add a JSONB array column for files
ALTER TABLE classroom_posts
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS file_type,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB;

ALTER TABLE submissions
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS file_type,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB;
