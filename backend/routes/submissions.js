const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/submissions/:post_id  — all submissions for a post (faculty view)
router.get('/submissions/:post_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('post_id', req.params.post_id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/submissions/:post_id/:student_id  — student's own submission
router.get('/submissions/:post_id/:student_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('post_id', req.params.post_id)
      .eq('student_id', req.params.student_id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/submissions  — student submits
router.post('/submissions', async (req, res) => {
  try {
    const { post_id, classroom_id, student_id, student_name, content, attachments } = req.body;
    
    // Default to empty array if no attachments
    const attachmentsData = attachments || [];

    const { data, error } = await supabase
      .from('submissions')
      .insert([{ post_id, classroom_id, student_id, student_name, content, attachments: attachmentsData, status: 'Submitted' }])
      .select();
    if (error) throw error;
    res.json({ success: true, message: 'Assignment submitted', data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/submissions/:id/grade  — faculty grades a submission
router.put('/submissions/:id/grade', async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const { data, error } = await supabase
      .from('submissions')
      .update({ grade, feedback, status: 'Graded' })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json({ success: true, message: 'Submission graded', data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
