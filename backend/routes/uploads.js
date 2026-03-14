const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const path = require('path');

// use memory storage - we'll pipe the buffer straight to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|pdf|doc|docx|ppt|pptx/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// POST /api/upload  — upload multiple files to Supabase Storage
router.post('/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files provided' });

    const uploadedFiles = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `classroom-files/${timestamp}_${safeName}`;

      // Upload to Supabase Storage bucket
      const { data, error } = await supabase.storage
        .from('campus-files')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campus-files')
        .getPublicUrl(filePath);

      // Determine file category for frontend rendering
      const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const vidExts = ['.mp4', '.mov', '.avi', '.webm'];
      let fileType = 'document';
      if (imgExts.includes(ext)) fileType = 'image';
      else if (vidExts.includes(ext)) fileType = 'video';
      else if (ext === '.pdf') fileType = 'pdf';

      uploadedFiles.push({
        file_url: publicUrl,
        file_name: file.originalname,
        file_type: fileType,
        file_size: file.size
      });
    }

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
