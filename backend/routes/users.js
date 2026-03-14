const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

// --- AUTO-ASSIGN CLASS FROM ENROLLMENT ID ---
// Format: 24DCE001 => year(2) + 'D' + branch(2-3) + roll(3)
// Supports: CE, CS, IT, ME, EC
function assignClass(enrollmentId) {
  if (!enrollmentId) return null;
  const match = enrollmentId.match(/^(\d{2})D([A-Z]{2,3})(\d{3})$/);
  if (!match) return null;
  const admissionYear = parseInt(match[1], 10); // e.g. 24
  const branch = match[2];                       // e.g. CE
  const roll = parseInt(match[3], 10);           // e.g. 001 => 1
  const supported = ['CE', 'CS', 'IT', 'ME', 'EC'];
  if (!supported.includes(branch)) return null;
  // Dynamic prefix based on admission year AND current month:
  // Each academic year has 2 semesters. New year starts in JUNE.
  // Before June: even semester => (yearDiff * 2)
  // From June:   odd semester  => (yearDiff * 2) + 1
  const now = new Date();
  const currentYear = now.getFullYear() % 100; // e.g. 26
  const isNewAcademicYear = now.getMonth() >= 5; // June = index 5
  const yearDiff = currentYear - admissionYear;
  const semesterPrefix = yearDiff * 2 + (isNewAcademicYear ? 1 : 0);
  if (semesterPrefix <= 0) return null; // future or invalid
  if (roll >= 1  && roll <= 74)  return `${semesterPrefix}${branch}1`;
  if (roll >= 75 && roll <= 150) return `${semesterPrefix}${branch}2`;
  return null;
}

// --- AUTO-ASSIGN DEPARTMENT FROM BRANCH CODE ---
function assignDepartment(enrollmentId) {
  if (!enrollmentId) return null;
  const match = enrollmentId.match(/^\d{2}D([A-Z]{2,3})\d{3}$/);
  if (!match) return null;
  const departmentMap = {
    CE: 'Computer Engineering',
    CS: 'Computer Science',
    IT: 'Information Technology',
    ME: 'Mechanical Engineering',
    EC: 'Electronics & Communication',
  };
  return departmentMap[match[1]] || null;
}

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

    // Auto-assign class and department from enrollment ID for students
    const autoClass = role === 'Student' ? assignClass(custom_id) : null;
    const autoDepartment = role === 'Student' ? (assignDepartment(custom_id) || department) : department;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-assign class for students based on enrollment ID
    const className = role === 'Student' ? assignSection(custom_id) : null;

    const { data, error } = await supabase
      .from('users')
      .insert([{
        custom_id,
        full_name,
        email,
        password: hashedPassword,
        role,
        department: autoDepartment,
        phone,
        class: autoClass
      }])
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.json({ success: false, message: 'User ID or Email already exists' });
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
    // Re-compute class and department from the enrollment ID
    const autoClass = role === 'Student' ? assignClass(id) : null;
    const autoDepartment = role === 'Student' ? (assignDepartment(id) || department) : department;
    const updateData = { full_name, email, role, department: autoDepartment, phone, class: autoClass };

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
