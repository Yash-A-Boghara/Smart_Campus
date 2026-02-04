// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// --- DATABASE CONNECTION ---
mongoose.connect('mongodb://localhost:27017/smart_campus_db')
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ DB Connection Error:", err));

// --- SCHEMAS & MODELS ---

// 1. User Schema (Students, Faculty, Admin)
const UserSchema = new mongoose.Schema({
    custom_id: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: String,
    full_name: String,
    department: String,
    email: String,
    phone: String
}, { collection: 'users' });
const User = mongoose.model('User', UserSchema);

// 2. Assignment Schema
const AssignmentSchema = new mongoose.Schema({
    title: String,
    subject: String,
    dueDate: String,
    description: String,
    type: String 
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

// 3. Leave Schema
const LeaveSchema = new mongoose.Schema({
    studentId: String,
    studentName: String,
    reason: String,
    date: String,
    status: { type: String, default: 'Pending' }
});
const Leave = mongoose.model('Leave', LeaveSchema);

// 4. Complaint Schema
const ComplaintSchema = new mongoose.Schema({
    studentId: String,
    category: String,
    description: String,
    status: { type: String, default: 'Open' }
});
const Complaint = mongoose.model('Complaint', ComplaintSchema);


// --- API ROUTES ---

// 1. LOGIN API
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    try {
        const user = await User.findOne({ custom_id: userId });
        if (!user) return res.json({ success: false, message: "User ID not found" });
        if (user.password !== password) return res.json({ success: false, message: "Wrong password" });

        res.json({ success: true, role: user.role, name: user.full_name, message: "Login Successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 2. USER MANAGEMENT API (For Admin)
app.get('/api/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, message: "User added" });
    } catch (error) { res.status(500).json({ success: false, message: "Error adding user" }); }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { _id, ...updateData } = req.body;
        await User.findOneAndUpdate({ custom_id: req.params.id }, updateData);
        res.json({ success: true, message: "User updated" });
    } catch (error) { res.status(500).json({ success: false, message: "Error updating" }); }
});

app.delete('/api/users/:id', async (req, res) => {
    await User.findOneAndDelete({ custom_id: req.params.id });
    res.json({ success: true, message: "User deleted" });
});


// 3. ASSIGNMENTS API
app.get('/api/assignments', async (req, res) => {
    const tasks = await Assignment.find();
    res.json(tasks);
});

// Seeder Route (Run once to add dummy data)
app.get('/api/seed-assignments', async (req, res) => {
    await Assignment.deleteMany({});
    await Assignment.create([
        { title: "TCP/IP Report", subject: "CN", dueDate: "20 Jan", description: "Explain 4 layers.", type: "Assignment" },
        { title: "SQL Queries", subject: "DBMS", dueDate: "22 Jan", description: "Solve attached queries.", type: "Assignment" },
        { title: "Algebra Notes", subject: "Maths", dueDate: "-", description: "Chapter 4 PDF", type: "Material" }
    ]);
    res.send("Seeded Assignments");
});


// 4. LEAVES API (CRUD)
// Get leaves for specific student
app.get('/api/leaves/:studentId', async (req, res) => {
    const leaves = await Leave.find({ studentId: req.params.studentId });
    res.json(leaves);
});

// Add new leave
app.post('/api/leaves', async (req, res) => {
    const newLeave = new Leave(req.body);
    await newLeave.save();
    res.json({ success: true, message: "Leave Applied" });
});

// Update leave
app.put('/api/leaves/:id', async (req, res) => {
    try {
        await Leave.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true, message: "Leave Updated" });
    } catch (err) { res.status(500).json({ message: "Update Failed" }); }
});

// Delete leave
app.delete('/api/leaves/:id', async (req, res) => {
    try {
        await Leave.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Leave Deleted" });
    } catch (err) { res.status(500).json({ message: "Delete Failed" }); }
});


// 5. COMPLAINTS API (CRUD)
// Get complaints for specific student
app.get('/api/complaints/:studentId', async (req, res) => {
    const complaints = await Complaint.find({ studentId: req.params.studentId });
    res.json(complaints);
});

// Add new complaint
app.post('/api/complaints', async (req, res) => {
    const newComplaint = new Complaint(req.body);
    await newComplaint.save();
    res.json({ success: true, message: "Complaint Submitted" });
});

// Update complaint
app.put('/api/complaints/:id', async (req, res) => {
    try {
        await Complaint.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true, message: "Complaint Updated" });
    } catch (err) { res.status(500).json({ message: "Update Failed" }); }
});

// Delete complaint
app.delete('/api/complaints/:id', async (req, res) => {
    try {
        await Complaint.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Complaint Deleted" });
    } catch (err) { res.status(500).json({ message: "Delete Failed" }); }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});