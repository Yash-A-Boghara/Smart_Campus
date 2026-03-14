const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const assignmentRoutes = require('./routes/assignments');
const leaveRoutes = require('./routes/leaves');
const complaintRoutes = require('./routes/complaints');
const classroomRoutes = require('./routes/classrooms');
const classroomPostRoutes = require('./routes/classroom_posts');
const submissionRoutes = require('./routes/submissions');
const uploadRoutes = require('./routes/uploads');

// Register routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', leaveRoutes);
app.use('/api', complaintRoutes);
app.use('/api', classroomRoutes);
app.use('/api', classroomPostRoutes);
app.use('/api', submissionRoutes);
app.use('/api', uploadRoutes);


// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Campus API is running',
    version: '1.0.0',
    endpoints: {
      auth: 'POST /api/login',
      users: 'GET/POST/PUT/DELETE /api/users',
      assignments: 'GET/POST/DELETE /api/assignments',
      leaves: 'GET/POST/PUT/DELETE /api/leaves',
      complaints: 'GET/POST/PUT/DELETE /api/complaints'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Smart Campus Backend Server Started`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(50)}\n`);
});
