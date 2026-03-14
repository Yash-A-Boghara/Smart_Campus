const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/classroom-posts/:classroom_id  — all posts for a classroom
router.get('/classroom-posts/:classroom_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('classroom_posts')
      .select('*')
      .eq('classroom_id', req.params.classroom_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classroom-posts  — create post
router.post('/classroom-posts', async (req, res) => {
  try {
    const { classroom_id, type, title, description, points, due_date, faculty_id, attachments } = req.body;
    
    // Default to empty array if no attachments provided
    const attachmentsData = attachments || [];

    const { data, error } = await supabase
      .from('classroom_posts')
      .insert([{ classroom_id, type, title, description, points: points || 0, due_date, faculty_id, attachments: attachmentsData }])
      .select();
    if (error) throw error;
    res.json({ success: true, message: `${type} posted`, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// PUT /api/classroom-posts/:id  — update post
router.put('/classroom-posts/:id', async (req, res) => {
  try {
    const { title, description, points, due_date } = req.body;
    const { data, error } = await supabase
      .from('classroom_posts')
      .update({ title, description, points: points || 0, due_date })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, message: 'Post updated', data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classroom-posts/:id
router.delete('/classroom-posts/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('classroom_posts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
