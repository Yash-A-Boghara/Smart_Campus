const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Generate a random 6-char class code
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const BANNER_COLORS = ['#1a73e8','#1e8e3e','#d93025','#f29900','#6200ea','#00838f','#c2185b','#4527a0'];

// GET /api/classrooms?faculty_id=X  — faculty's classrooms
router.get('/classrooms', async (req, res) => {
  try {
    const { faculty_id } = req.query;
    let query = supabase.from('classrooms').select('*').order('created_at', { ascending: false });
    if (faculty_id) query = query.eq('faculty_id', faculty_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/classrooms/student/:student_id  — classrooms student is enrolled in
router.get('/classrooms/student/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { data: enrollments, error: eErr } = await supabase
      .from('classroom_enrollments')
      .select('classroom_id')
      .eq('student_id', student_id);
    if (eErr) throw eErr;

    if (!enrollments || enrollments.length === 0) return res.json([]);

    const ids = enrollments.map(e => e.classroom_id);
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/classrooms/:id/people  — enrolled students
router.get('/classrooms/:id/people', async (req, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('classroom_enrollments')
      .select('*')
      .eq('classroom_id', req.params.id)
      .order('student_id', { ascending: true }); // Ascending order by ID per user request
      
    if (error) throw error;
    if (!enrollments || enrollments.length === 0) return res.json([]);

    // Fetch class and batch from users table
    const studentIds = enrollments.map(e => e.student_id);
    const { data: usersData, error: uErr } = await supabase
      .from('users')
      .select('custom_id, class, batch')
      .in('custom_id', studentIds);
      
    if (uErr) throw uErr;

    const userMap = {};
    usersData.forEach(u => userMap[u.custom_id] = u);

    const enriched = enrollments.map(e => ({
      ...e,
      class_name: userMap[e.student_id]?.class || '-',
      batch: userMap[e.student_id]?.batch || '-'
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classrooms  — create classroom
router.post('/classrooms', async (req, res) => {
  try {
    const { name, subject, section, room, faculty_id, faculty_name } = req.body;
    const class_code = generateCode();
    const banner_color = BANNER_COLORS[Math.floor(Math.random() * BANNER_COLORS.length)];

    const { data, error } = await supabase
      .from('classrooms')
      .insert([{ name, subject, section, room, class_code, faculty_id, faculty_name, banner_color }])
      .select();
    if (error) throw error;
    res.json({ success: true, message: 'Classroom created', data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classrooms/join  — student joins via class code
router.post('/classrooms/join', async (req, res) => {
  try {
    const { class_code, student_id, student_name } = req.body;

    // Find classroom by code
    const { data: classroom, error: cErr } = await supabase
      .from('classrooms')
      .select('*')
      .eq('class_code', class_code.trim().toUpperCase())
      .single();
    if (cErr || !classroom) return res.json({ success: false, message: 'Invalid class code' });

    // Prevent faculty joining own class
    if (classroom.faculty_id === student_id) {
      return res.json({ success: false, message: 'You are the teacher of this class' });
    }

    // Enroll
    const { error: eErr } = await supabase
      .from('classroom_enrollments')
      .insert([{ classroom_id: classroom.id, student_id, student_name }]);
    if (eErr) {
      if (eErr.code === '23505') return res.json({ success: false, message: 'Already enrolled in this class' });
      throw eErr;
    }
    res.json({ success: true, message: `Joined "${classroom.name}"`, data: classroom });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classrooms/:id
router.delete('/classrooms/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('classrooms').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Classroom deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classrooms/:classroomId/students/:studentId  — remove a student from classroom
router.delete('/classrooms/:classroomId/students/:studentId', async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    const { error } = await supabase
      .from('classroom_enrollments')
      .delete()
      .eq('classroom_id', classroomId)
      .eq('student_id', studentId);
    if (error) throw error;
    res.json({ success: true, message: 'Student removed from classroom' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classrooms/:id/auto-enroll  — Auto-enroll students by class/batch
router.post('/classrooms/:id/auto-enroll', async (req, res) => {
  try {
    const classroom_id = req.params.id;
    const { class_name, batch } = req.body;

    if (!class_name) {
      return res.json({ success: false, message: 'Class name is required' });
    }

    // 1. Fetch matching students from users table
    let query = supabase
      .from('users')
      .select('custom_id, full_name')
      .eq('role', 'Student')
      .eq('class', class_name);
    
    if (batch && batch !== 'All') {
      query = query.eq('batch', batch);
    }

    const { data: students, error: studentErr } = await query;
    if (studentErr) throw studentErr;

    if (!students || students.length === 0) {
      return res.json({ success: false, message: 'No students found matching this criteria' });
    }

    // 2. Fetch existing enrollments for this classroom
    const { data: existingRecords, error: extErr } = await supabase
      .from('classroom_enrollments')
      .select('student_id')
      .eq('classroom_id', classroom_id);
    if (extErr) throw extErr;

    const existingStudentIds = existingRecords.map(r => r.student_id);

    // 3. Filter out students already enrolled
    const newStudents = students.filter(s => !existingStudentIds.includes(s.custom_id));

    if (newStudents.length === 0) {
      return res.json({ success: true, message: 'All matching students are already enrolled in this class' });
    }

    // 4. Insert new students
    const enrollments = newStudents.map(s => ({
      classroom_id,
      student_id: s.custom_id,
      student_name: s.full_name
    }));

    const { error: insertErr } = await supabase
      .from('classroom_enrollments')
      .insert(enrollments);
    
    if (insertErr) throw insertErr;

    res.json({ success: true, message: `Successfully enrolled ${newStudents.length} student(s)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
