import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // User Data
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Data Lists
  const [assignments, setAssignments] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  
  // Forms & Edit States
  const [leaveForm, setLeaveForm] = useState({ reason: "", date: "" });
  const [editingLeaveId, setEditingLeaveId] = useState(null); // Tracks if we are editing a leave

  const [complaintForm, setComplaintForm] = useState({ category: "", description: "" });
  const [editingComplaintId, setEditingComplaintId] = useState(null); // Tracks if we are editing a complaint

  useEffect(() => {
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId");
    if (!id) { navigate("/"); return; }
    
    setStudentName(name);
    setStudentId(id);
    fetchAssignments();
    fetchMyLeaves(id);
    fetchMyComplaints(id);
  }, []);

  // --- API FETCHERS ---
  const fetchAssignments = async () => {
    try { const res = await fetch("http://localhost:5000/api/assignments"); setAssignments(await res.json()); } catch (e) {}
  };
  const fetchMyLeaves = async (id) => {
    try { const res = await fetch(`http://localhost:5000/api/leaves/${id}`); setMyLeaves(await res.json()); } catch (e) {}
  };
  const fetchMyComplaints = async (id) => {
    try { const res = await fetch(`http://localhost:5000/api/complaints/${id}`); setMyComplaints(await res.json()); } catch (e) {}
  };

  // --- LEAVE HANDLERS (Add, Edit, Delete) ---
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...leaveForm, studentId, studentName };
    
    if (editingLeaveId) {
        // UPDATE Existing Leave
        await fetch(`http://localhost:5000/api/leaves/${editingLeaveId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        alert("Leave Updated!");
        setEditingLeaveId(null);
    } else {
        // CREATE New Leave
        await fetch("http://localhost:5000/api/leaves", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        alert("Leave Applied!");
    }
    setLeaveForm({ reason: "", date: "" });
    fetchMyLeaves(studentId);
  };

  const editLeave = (leave) => {
      setLeaveForm({ reason: leave.reason, date: leave.date });
      setEditingLeaveId(leave._id);
  };

  const deleteLeave = async (id) => {
      if(window.confirm("Delete this leave application?")) {
          await fetch(`http://localhost:5000/api/leaves/${id}`, { method: "DELETE" });
          fetchMyLeaves(studentId);
      }
  };

  // --- COMPLAINT HANDLERS (Add, Edit, Delete) ---
  const handleComplaintSubmit = async () => {
    if(!complaintForm.category || !complaintForm.description) return alert("Fill all fields");
    const payload = { ...complaintForm, studentId };

    if (editingComplaintId) {
        // UPDATE Existing Complaint
        await fetch(`http://localhost:5000/api/complaints/${editingComplaintId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        alert("Complaint Updated!");
        setEditingComplaintId(null);
    } else {
        // CREATE New Complaint
        await fetch("http://localhost:5000/api/complaints", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        alert("Complaint Submitted!");
    }
    setComplaintForm({ category: "", description: "" });
    fetchMyComplaints(studentId);
  };

  const editComplaint = (c) => {
      setComplaintForm({ category: c.category, description: c.description });
      setEditingComplaintId(c._id);
  };

  const deleteComplaint = async (id) => {
      if(window.confirm("Delete this complaint?")) {
          await fetch(`http://localhost:5000/api/complaints/${id}`, { method: "DELETE" });
          fetchMyComplaints(studentId);
      }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // --- RENDER ---
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="welcome-banner">
              <div>
                <h2>Hello, {studentName}! 👋</h2>
                <p>You have {assignments.length} new updates in classroom.</p>
              </div>
              <div className="date-badge">{new Date().toLocaleDateString('en-GB')}</div>
            </div>
            
            <div className="stats-grid">
              <div className="card orange"><h3>Assignments</h3><p>{assignments.length}</p></div>
              <div className="card purple"><h3>Leaves</h3><p>{myLeaves.length}</p></div>
              <div className="card red"><h3>Complaints</h3><p>{myComplaints.length}</p></div>
            </div>
          </>
        );

      case "classroom":
        return (
          <div className="section-box">
            <h3>📚 Classroom Updates</h3>
            <div className="classroom-grid">
              {assignments.map((task) => (
                <div key={task._id} className={`assignment-card ${task.type === 'Material' ? 'material' : ''}`}>
                  <div className="card-header">
                    <span className="subject-tag">{task.subject}</span>
                    <span className="due-date">{task.dueDate}</span>
                  </div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                  <button className="action-btn">{task.type === 'Assignment' ? 'Upload PDF' : 'Download'}</button>
                </div>
              ))}
            </div>
          </div>
        );

      case "leaves":
        return (
          <div className="section-box">
            <h3>📝 Leave Applications</h3>
            <form className="std-form" onSubmit={handleLeaveSubmit} style={{marginBottom: "20px", background: "#f8fafc", padding: "15px", borderRadius: "10px"}}>
               <h4 style={{marginTop:0}}>{editingLeaveId ? "Edit Leave Application" : "Apply for New Leave"}</h4>
               <div style={{display: "flex", gap: "10px"}}>
                 <input type="text" placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{flex: 2}} />
                 <input type="date" value={leaveForm.date} onChange={(e) => setLeaveForm({...leaveForm, date: e.target.value})} required style={{flex: 1}} />
                 <button className="primary-btn" type="submit">{editingLeaveId ? "Update" : "Apply"}</button>
                 {editingLeaveId && <button type="button" onClick={()=>{setEditingLeaveId(null); setLeaveForm({reason:"", date:""})}} className="cancel-btn">Cancel</button>}
               </div>
            </form>
            <table className="std-table">
              <thead><tr><th>Date</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {myLeaves.map((l) => (
                  <tr key={l._id}>
                      <td>{l.date}</td><td>{l.reason}</td>
                      <td><span className={`status ${l.status.toLowerCase()}`}>{l.status}</span></td>
                      <td>
                          <button className="sm-btn edit" onClick={() => editLeave(l)}>✏️</button>
                          <button className="sm-btn del" onClick={() => deleteLeave(l._id)}>🗑️</button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "complaints":
        return (
          <div className="section-box">
            <h3>⚠️ My Complaints</h3>
            <div className="std-form" style={{background: "#fff5f5", padding: "20px", borderRadius: "10px", marginBottom: "30px", border: "1px solid #fee2e2"}}>
              <h4 style={{marginTop: 0, color: "#991b1b"}}>{editingComplaintId ? "Edit Complaint" : "Report an Issue"}</h4>
              <select value={complaintForm.category} onChange={(e) => setComplaintForm({...complaintForm, category: e.target.value})} style={{marginBottom: "10px"}}>
                <option value="">Select Category</option>
                <option value="Cleanliness">Cleanliness</option>
                <option value="Lab">Lab Issue</option>
                <option value="Other">Other</option>
              </select>
              <textarea rows="3" placeholder="Describe..." value={complaintForm.description} onChange={(e) => setComplaintForm({...complaintForm, description: e.target.value})}></textarea>
              <div style={{marginTop: "10px", display:"flex", gap:"10px"}}>
                  <button className="primary-btn" onClick={handleComplaintSubmit} style={{background: "#ef4444"}}>{editingComplaintId ? "Update Complaint" : "Submit Complaint"}</button>
                  {editingComplaintId && <button onClick={()=>{setEditingComplaintId(null); setComplaintForm({category:"", description:""})}} className="cancel-btn">Cancel</button>}
              </div>
            </div>
            <table className="std-table">
              <thead><tr><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {myComplaints.map((c) => (
                  <tr key={c._id}>
                      <td><strong>{c.category}</strong></td><td>{c.description}</td>
                      <td><span className={`status ${c.status.toLowerCase() === 'open' ? 'rejected' : 'approved'}`}>{c.status}</span></td>
                      <td>
                          <button className="sm-btn edit" onClick={() => editComplaint(c)}>✏️</button>
                          <button className="sm-btn del" onClick={() => deleteComplaint(c._id)}>🗑️</button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default: return <div>Select Tab</div>;
    }
  };

  return (
    <div className="std-container">
      <aside className="std-sidebar">
        <div className="logo">🎓 CampusHub</div>
        <nav>
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={activeTab === "classroom" ? "active" : ""} onClick={() => setActiveTab("classroom")}>Classroom</button>
          <button className={activeTab === "leaves" ? "active" : ""} onClick={() => setActiveTab("leaves")}>Leaves</button>
          <button className={activeTab === "complaints" ? "active" : ""} onClick={() => setActiveTab("complaints")}>Complaints</button>
        </nav>
        <button className="logout-link" onClick={handleLogout}>Logout</button>
      </aside>
      <main className="std-main">{renderContent()}</main>
    </div>
  );
};

export default StudentDashboard;