-- Add batch column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS batch TEXT;

-- Backfill batch for all existing students based on roll number
-- Roll 1-25 = A1, 26-50 = B1, 51-75 = C1, 76-100 = A2, 101-125 = B2, 126-150 = C2
UPDATE users
SET batch = CASE
  WHEN role = 'Student' AND custom_id ~ '^\d{2}[A-Z]?[A-Z]{2}\d{3,}$' THEN
    CASE
      WHEN CAST(SUBSTRING(custom_id FROM '[A-Z]{2}(\d{3,})$') AS INTEGER) BETWEEN 1 AND 25 THEN 'A1'
      WHEN CAST(SUBSTRING(custom_id FROM '[A-Z]{2}(\d{3,})$') AS INTEGER) BETWEEN 26 AND 50 THEN 'B1'
      WHEN CAST(SUBSTRING(custom_id FROM '[A-Z]{2}(\d{3,})$') AS INTEGER) BETWEEN 51 AND 75 THEN 'C1'
      WHEN CAST(SUBSTRING(custom_id FROM '[A-Z]{2}(\d{3,})$') AS INTEGER) BETWEEN 76 AND 100 THEN 'A2'
      WHEN CAST(SUBSTRING(custom_id FROM '[A-Z]{2}(\d{3,})$') AS INTEGER) BETWEEN 101 AND 125 THEN 'B2'
      WHEN CAST(SUBSTRING(custom_id FROM '[A-Z]{2}(\d{3,})$') AS INTEGER) BETWEEN 126 AND 150 THEN 'C2'
      ELSE NULL
    END
  ELSE NULL
END
WHERE role = 'Student';
