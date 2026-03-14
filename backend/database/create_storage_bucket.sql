-- ============================================
-- CREATE CLASSROOM FILES STORAGE BUCKET
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the 'campus-files' bucket (make it public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campus-files', 'campus-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'campus-files' );

-- 3. Allow authenticated access to insert (upload) files
CREATE POLICY "Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'campus-files' );

-- 4. Allow authenticated access to update files
CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'campus-files' );

-- 5. Allow authenticated access to delete files
CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'campus-files' );
