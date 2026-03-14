-- Smart Campus: Add section column to users table
-- Run this once in your Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS section TEXT;
