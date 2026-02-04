import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./FacultyDashboard.css";

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [facultyName, setFacultyName] = useState("Faculty");

  // Data States
  const [assignments, setAssignments] = useState([]);

  // Form State
  const [assForm, setAssForm] = useState({
    title: "", subject: "", dueDate: "", description: "", type: "Assignment"
  });

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setFacultyName(name);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const res = await fetch("http://localhost:5000/api/assignments");
        setAssignments(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handlePostAssignment = async (e) => {
    e.preventDefault();
    if (!assForm.title || !assForm.subject) return alert("Fill required fields");

    await fetch("http://localhost:5000/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assForm)
    });

    alert("Posted Successfully!");
    setAssForm({ title: "", subject: "", dueDate: "", description: "", type: "Assignment" });
    fetchData();
  };

  const handleDeleteAssignment = async (id) => {
    if (window.confirm("Delete this assignment?")) {
      await fetch(`http://localhost:5000/api/assignments/${id}`, { method: "DELETE" });
      fetchData();
    }
  };

  // --- NAVIGATION TO COUNSELOR ---
  const goToCounselor = () => {
    navigate("/counselor");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="welcome-banner">
              <div>
                <h2>Welcome, Prof. {facultyName}! 👨‍🏫</h2>
                <p>Manage your classroom and students efficiently.</p>
              </div>
            </div>
            <div className="stats-grid">
               <div className="card blue"><h3>Total Assignments</h3><p>{assignments.length}</p></div>
               <div className="card purple"><h3>Classes Today</h3><p>3</p></div>
               
               {/* Shortcut Card to Counselor */}
               <div className="card green" onClick={goToCounselor} style={{cursor: "pointer", border: "2px solid #10b981"}}>
                  <h3>Counselor Actions</h3>
                  <p style={{fontSize: "18px", marginTop: "5px"}}>Manage Leaves &rarr;</p>
               </div>
            </div>
          </>
        );

      case "classroom":
        return (
          <div className="section-box">
            <h3>📚 Manage Classroom</h3>
            
            <form className="fac-form" onSubmit={handlePostAssignment}>
              <h4>Post New Material / Assignment</h4>
              <div className="form-row">
                <input type="text" placeholder="Title (e.g. Unit 1 Notes)" value={assForm.title} onChange={e => setAssForm({...assForm, title: e.target.value})} required />
                <input type="text" placeholder="Subject (e.g. DBMS)" value={assForm.subject} onChange={e => setAssForm({...assForm, subject: e.target.value})} required />
              </div>
              <div className="form-row">
                 <select value={assForm.type} onChange={e => setAssForm({...assForm, type: e.target.value})}>
                    <option value="Assignment">Assignment</option>
                    <option value="Material">Study Material</option>
                 </select>
                 <input type="text" placeholder="Due Date (Optional)" value={assForm.dueDate} onChange={e => setAssForm({...assForm, dueDate: e.target.value})} />
              </div>
              <textarea placeholder="Description / Instructions..." value={assForm.description} onChange={e => setAssForm({...assForm, description: e.target.value})}></textarea>
              <button className="primary-btn" type="submit">Post to Classroom</button>
            </form>

            <h4>Posted Items</h4>
            <div className="table-wrapper">
              <table className="fac-table">
                <thead><tr><th>Subject</th><th>Title</th><th>Type</th><th>Due</th><th>Action</th></tr></thead>
                <tbody>
                  {assignments.map(ass => (
                    <tr key={ass._id}>
                      <td><span className="subject-badge">{ass.subject}</span></td>
                      <td>{ass.title}</td>
                      <td>{ass.type}</td>
                      <td>{ass.dueDate || "-"}</td>
                      <td><button className="del-btn" onClick={() => handleDeleteAssignment(ass._id)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default: return <div>Select Tab</div>;
    }
  };

  return (
    <div className="fac-container">
      <aside className="fac-sidebar">
        <div className="logo">🎓 FacultyPortal</div>
        <nav>
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={activeTab === "classroom" ? "active" : ""} onClick={() => setActiveTab("classroom")}>Classroom</button>
          
          {/* LINK TO COUNSELOR DASHBOARD */}
          <div className="nav-divider" style={{margin: "10px 0", borderTop: "1px solid #e2e8f0"}}></div>
          <button className="counselor-link" onClick={goToCounselor} style={{color: "#059669"}}>
             🛡️ Counselor Panel
          </button>
        </nav>
        <button className="logout-link" onClick={handleLogout}>Logout</button>
      </aside>
      <main className="fac-main">{renderContent()}</main>
    </div>
  );
};

export default FacultyDashboard;