const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

// ─── AUTO-SECTION ALLOCATION ───────────────────────────────────────────────
// Enrollment ID format: 24DCE001  →  year=24, prefix=D, branch=CE, roll=001
// Semester calculation (assuming current year 2026):
//   year 25 -> (26 - 25) * 2 = Sem 2  (e.g., 2CE1)
//   year 24 -> (26 - 24) * 2 = Sem 4  (e.g., 4CE1)
const KNOWN_BRANCHES = ['CE', 'CS', 'IT', 'ME', 'EC'];

const assignSection = (enrollmentId) => {
  if (!enrollmentId) return null;
  const id = enrollmentId.toUpperCase().trim();

  // Try to extract year, branch and roll number
  // Pattern: year(2 digits) + optional letter + branch(2 letters) + roll(3+ digits)
  const match = id.match(/^(\d{2})[A-Z]?([A-Z]{2})(\d{3,})$/);
  if (!match) return null;

  const adminYear = parseInt(match[1], 10);
  const branch = match[2];
  const roll = parseInt(match[3], 10);

  if (!KNOWN_BRANCHES.includes(branch)) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100; // e.g., 2026 -> 26
  const currentMonth = currentDate.getMonth() + 1; // 1-12 (June is 6)

  // Prevent registering the upcoming batch before June
  if (adminYear > currentYear || (adminYear === currentYear && currentMonth < 6)) {
    return null;
  }

  // Prevent registering batches that have already graduated (more than 4 years ago)
  if (adminYear < currentYear - 4) {
    return null;
  }

  // Calculate semester using month-aware logic
  let semester = (currentYear - adminYear) * 2 + (currentMonth >= 6 ? 1 : 0);
  if (semester < 1) semester = 1;
  if (semester > 8) semester = 8; // Max 8 semesters

  if (roll >= 1 && roll <= 74)  return `${semester}${branch}1`;
  if (roll >= 75 && roll <= 150) return `${semester}${branch}2`;

  return null; // out of range
};

// ─── AUTO-BATCH ALLOCATION ─────────────────────────────────────────────────
// Roll 001-025 → A1, 026-050 → B1, 051-075 → C1
// Roll 076-100 → A2, 101-125 → B2, 126-150 → C2
const assignBatch = (enrollmentId) => {
  if (!enrollmentId) return null;
  const id = enrollmentId.toUpperCase().trim();
  const match = id.match(/^(\d{2})[A-Z]?([A-Z]{2})(\d{3,})$/);
  if (!match) return null;
  const roll = parseInt(match[3], 10);
  if (roll >= 1 && roll <= 25) return 'A1';
  if (roll >= 26 && roll <= 50) return 'B1';
  if (roll >= 51 && roll <= 75) return 'C1';
  if (roll >= 76 && roll <= 100) return 'A2';
  if (roll >= 101 && roll <= 125) return 'B2';
  if (roll >= 126 && roll <= 150) return 'C2';
  return null;
};

// GET /api/users - Fetch all users
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// POST /api/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const { custom_id, full_name, email, password, role, department, phone } = req.body;

    // Guard: Block current-year student registration before June
    if (role === 'Student') {
      const idMatch = custom_id && custom_id.match(/^(\d{2})D[A-Z]{2,3}\d{3}$/);
      if (idMatch) {
        const admissionYear = parseInt(idMatch[1], 10);
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const isBeforeJune = now.getMonth() < 5; // 0-indexed: May = 4
        if (admissionYear === currentYear && isBeforeJune) {
          return res.json({ success: false, message: `Cannot register ${currentYear + 2000} batch students before June. Admissions open in June.` });
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-assign class and batch for students based on enrollment ID
    const className = role === 'Student' ? assignSection(custom_id) : null;
    const batchName = role === 'Student' ? assignBatch(custom_id) : null;

    // Auto-generate email from custom_id if not provided (DB requires NOT NULL UNIQUE)
    const userEmail = email || `${custom_id.toLowerCase()}@campus.edu`;

    const insertData = {
      custom_id,
      full_name,
      email: userEmail,
      password: hashedPassword,
      role,
      department,
      phone,
      class: className,
      batch: batchName
    };

    const { data, error } = await supabase
      .from('users')
      .insert([insertData])
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.json({ success: false, message: 'User ID already exists' });
      }
      throw error;
    }

    res.json({ success: true, message: 'User created successfully', data });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password, role, department, phone } = req.body;
    // Re-compute class and batch from the enrollment ID
    const className = role === 'Student' ? assignSection(id) : null;
    const batchName = role === 'Student' ? assignBatch(id) : null;
    const updateData = { full_name, role, department, phone, class: className, batch: batchName };
    if (email) updateData.email = email;

    // Only hash and update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('custom_id', id)
      .select();

    if (error) throw error;

    res.json({ success: true, message: 'User updated successfully', data });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('custom_id', id);

    if (error) throw error;

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

module.exports = router;
