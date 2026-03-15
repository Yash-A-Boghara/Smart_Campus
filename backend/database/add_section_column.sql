<<<<<<< HEAD
-- Run this in Supabase SQL Editor
-- Ensures the 'class' column exists (no separate 'section' column needed)

ALTER TABLE users ADD COLUMN IF NOT EXISTS class VARCHAR(50);

-- Back-fill existing students with auto-computed class from enrollment ID
UPDATE users
SET class = CASE
  WHEN custom_id ~ '^[0-9]{2}DCE[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 1   AND 74  THEN '4CE1'
  WHEN custom_id ~ '^[0-9]{2}DCE[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 75  AND 150 THEN '4CE2'
  WHEN custom_id ~ '^[0-9]{2}DCS[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 1   AND 74  THEN '4CS1'
  WHEN custom_id ~ '^[0-9]{2}DCS[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 75  AND 150 THEN '4CS2'
  WHEN custom_id ~ '^[0-9]{2}DIT[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 1   AND 74  THEN '4IT1'
  WHEN custom_id ~ '^[0-9]{2}DIT[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 75  AND 150 THEN '4IT2'
  WHEN custom_id ~ '^[0-9]{2}DME[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 1   AND 74  THEN '4ME1'
  WHEN custom_id ~ '^[0-9]{2}DME[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 75  AND 150 THEN '4ME2'
  WHEN custom_id ~ '^[0-9]{2}DEC[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 1   AND 74  THEN '4EC1'
  WHEN custom_id ~ '^[0-9]{2}DEC[0-9]{3}$' AND CAST(SUBSTRING(custom_id FROM 6) AS INT) BETWEEN 75  AND 150 THEN '4EC2'
  ELSE class -- keep existing value if pattern doesn't match
END
WHERE role = 'Student';
=======
-- Smart Campus: Add section column to users table
-- Run this once in your Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS section TEXT;
>>>>>>> 886f32b3e60d37e2087b4ad644754cb5d3a7d310
