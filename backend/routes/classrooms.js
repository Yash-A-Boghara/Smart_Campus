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
    const { data, error } = await supabase
      .from('classroom_enrollments')
      .select('*')
      .eq('classroom_id', req.params.id)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
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

module.exports = router;
