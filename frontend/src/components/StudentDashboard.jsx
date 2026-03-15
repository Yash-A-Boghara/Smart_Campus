import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";
import "./StudentClassroom.css";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Original data
  const [assignments, setAssignments] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ reason: "", date: "" });
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ category: "", description: "" });
  const [editingComplaintId, setEditingComplaintId] = useState(null);

  // Classroom states
  const [classrooms, setClassrooms] = useState([]);
  const [activeClassroom, setActiveClassroom] = useState(null);
  const [classroomTab, setClassroomTab] = useState("stream");
  const [posts, setPosts] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Submission states
  const [submitModal, setSubmitModal] = useState(null); // { post }
  const [submitContent, setSubmitContent] = useState("");
  const [submitFiles, setSubmitFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [mySubmissions, setMySubmissions] = useState({}); // { post_id: submission }

  useEffect(() => {
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId");
    if (!id) { navigate("/"); return; }
    setStudentName(name);
    setStudentId(id);
    fetchAssignments();
    fetchMyLeaves(id);
    fetchMyComplaints(id);
    fetchMyClassrooms(id);
  }, []);

  // --- FETCH ---
  const fetchAssignments = async () => {
    try { const res = await fetch("http://localhost:5000/api/assignments"); setAssignments(await res.json()); } catch (e) {}
  };
  const fetchMyLeaves = async (id) => {
    try { const res = await fetch(`http://localhost:5000/api/leaves/${id}`); setMyLeaves(await res.json()); } catch (e) {}
  };
  const fetchMyComplaints = async (id) => {
    try { const res = await fetch(`http://localhost:5000/api/complaints/${id}`); setMyComplaints(await res.json()); } catch (e) {}
  };
  const fetchMyClassrooms = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/classrooms/student/${id}`);
      setClassrooms(await res.json());
    } catch (e) {}
  };

  const fetchPosts = async (classroomId, sid) => {
    try {
      const res = await fetch(`http://localhost:5000/api/classroom-posts/${classroomId}`);
      const data = await res.json();
      setPosts(data);
      // Fetch submission status for all assignments
      const id = sid || studentId;
      const subsMap = {};
      for (const post of data.filter(p => p.type === "Assignment")) {
        const sRes = await fetch(`http://localhost:5000/api/submissions/${post.id}/${id}`);
        const sub = await sRes.json();
        if (sub) subsMap[post.id] = sub;
      }
      setMySubmissions(subsMap);
    } catch (e) {}
  };

  const openClassroom = (cls) => {
    setActiveClassroom(cls);
    setClassroomTab("stream");
    fetchPosts(cls.id);
  };

  // --- JOIN CLASS ---
  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinLoading(true);
    const res = await fetch("http://localhost:5000/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_code: joinCode, student_id: studentId, student_name: studentName }),
    });
    const data = await res.json();
    setJoinLoading(false);
    if (data.success) {
      setShowJoinModal(false);
      setJoinCode("");
      fetchMyClassrooms(studentId);
      alert(`✅ ${data.message}`);
    } else alert(`❌ ${data.message}`);
  };

  // --- SUBMIT ASSIGNMENT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    let attachments = [];

    if (submitFiles.length > 0) {
      const formData = new FormData();
      submitFiles.forEach(file => formData.append("files", file));
      try {
        const uRes = await fetch("http://localhost:5000/api/upload", { method: "POST", body: formData });
        const uData = await uRes.json();
        if (uData.success) {
          attachments = uData.files;
        } else {
          alert("Upload failed: " + uData.message);
          setUploading(false);
          return;
        }
      } catch (err) {
        alert("Upload error");
        setUploading(false);
        return;
      }
    }

    const payload = {
      post_id: submitModal.post.id,
      classroom_id: activeClassroom.id,
      student_id: studentId,
      student_name: studentName,
      content: submitContent,
      attachments
    };

    const res = await fetch("http://localhost:5000/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setSubmitModal(null);
      setSubmitContent("");
      setSubmitFiles([]);
      fetchPosts(activeClassroom.id);
      alert("✅ Assignment submitted successfully!");
    } else alert(`❌ ${data.message}`);
  };

  // --- LEAVES ---
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...leaveForm, studentId, studentName };
    if (editingLeaveId) {
      await fetch(`http://localhost:5000/api/leaves/${editingLeaveId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      alert("Leave Updated!"); setEditingLeaveId(null);
    } else {
      await fetch("http://localhost:5000/api/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      alert("Leave Applied!");
    }
    setLeaveForm({ reason: "", date: "" }); fetchMyLeaves(studentId);
  };
  const editLeave = (leave) => { setLeaveForm({ reason: leave.reason, date: leave.date }); setEditingLeaveId(leave._id); };
  const deleteLeave = async (id) => { if (window.confirm("Delete?")) { await fetch(`http://localhost:5000/api/leaves/${id}`, { method: "DELETE" }); fetchMyLeaves(studentId); } };

  // --- COMPLAINTS ---
  const handleComplaintSubmit = async () => {
    if (!complaintForm.category || !complaintForm.description) return alert("Fill all fields");
    const payload = { ...complaintForm, studentId };
    if (editingComplaintId) {
      await fetch(`http://localhost:5000/api/complaints/${editingComplaintId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      alert("Updated!"); setEditingComplaintId(null);
    } else {
      await fetch("http://localhost:5000/api/complaints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      alert("Submitted!");
    }
    setComplaintForm({ category: "", description: "" }); fetchMyComplaints(studentId);
  };
  const editComplaint = (c) => { setComplaintForm({ category: c.category, description: c.description }); setEditingComplaintId(c._id); };
  const deleteComplaint = async (id) => { if (window.confirm("Delete?")) { await fetch(`http://localhost:5000/api/complaints/${id}`, { method: "DELETE" }); fetchMyComplaints(studentId); } };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const postTypeIcon = { Announcement: "📢", Assignment: "📝", Material: "📄" };
  const postTypeBadgeClass = { Announcement: "badge-ann", Assignment: "badge-asgn", Material: "badge-mat" };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="cls-attachments-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
        {attachments.map((att, idx) => {
          const isImg = att.file_type === "image";
          return (
            <div key={idx} className="cls-attachment" onClick={() => setPreviewFile({ url: att.file_url, name: att.file_name, type: att.file_type })} style={{ cursor: "pointer", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px", display: "flex", alignItems: "center", gap: "10px", background: "#f9fafb", minWidth: "200px", maxWidth: "100%" }}>
              {isImg ? <img src={att.file_url} alt={att.file_name} style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} /> : <span style={{ fontSize: "24px" }}>{att.file_type === 'video' ? '🎥' : att.file_type === 'pdf' ? '📕' : '📄'}</span>}
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: 500 }}>{att.file_name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== RENDER ====================
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="welcome-banner">
              <div>
                <h2>Hello, {studentName}! 👋</h2>
                <p>You are enrolled in {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}.</p>
              </div>
              <div className="date-badge">{new Date().toLocaleDateString("en-GB")}</div>
            </div>
            <div className="stats-grid">
              <div className="card blue"><h3>Classrooms</h3><p>{classrooms.length}</p></div>
              <div className="card purple"><h3>Leaves</h3><p>{myLeaves.length}</p></div>
              <div className="card red"><h3>Complaints</h3><p>{myComplaints.length}</p></div>
            </div>
          </>
        );

      case "classroom":
        // Inside a classroom
        if (activeClassroom) {
          const streamPosts = posts;
          const assignmentPosts = posts.filter(p => p.type === "Assignment");
          const materialPosts = posts.filter(p => p.type === "Material");

          return (
            <div className="stu-cls-inner">
              {/* Banner */}
              <div className="stu-cls-banner" style={{ background: activeClassroom.banner_color }}>
                <button className="stu-cls-back-btn" onClick={() => setActiveClassroom(null)}>← My Classes</button>
                <div className="stu-cls-banner-info">
                  <h2>{activeClassroom.name}</h2>
                  <p>{activeClassroom.subject} {activeClassroom.section && `· ${activeClassroom.section}`}</p>
                  <span className="stu-cls-teacher">👨‍🏫 {activeClassroom.faculty_name}</span>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="cls-subtabs">
                {["stream", "classwork"].map(t => (
                  <button key={t} className={`cls-subtab ${classroomTab === t ? "active" : ""}`}
                    onClick={() => setClassroomTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* ---- STREAM ---- */}
              {classroomTab === "stream" && (
                <div className="stu-stream">
                  {streamPosts.length === 0 ? (
                    <div className="cls-empty">Your teacher hasn't posted anything yet.</div>
                  ) : (
                    streamPosts.map(post => {
                      const mySub = mySubmissions[post.id];
                      return (
                        <div key={post.id} className="stu-feed-card">
                          <div className="cls-feed-header">
                            <div className="cls-feed-avatar" style={{ background: activeClassroom.banner_color }}>{activeClassroom.faculty_name[0]}</div>
                            <div>
                              <strong>{activeClassroom.faculty_name}</strong>
                              <span className="cls-feed-time">{formatDate(post.created_at)}</span>
                            </div>
                            <span className={`cls-type-badge ${postTypeBadgeClass[post.type]}`}>{postTypeIcon[post.type]} {post.type}</span>
                          </div>
                          <h4 className="cls-feed-title">{post.title}</h4>
                          {post.description && <p className="cls-feed-desc">{post.description}</p>}
                          {renderAttachments(post.attachments)}

                          {post.type === "Assignment" && (
                            <div className="stu-asgn-footer">
                              <div className="stu-asgn-meta">
                                {post.points > 0 && <span>🏅 {post.points} pts</span>}
                                {post.due_date && <span>⏰ Due: {post.due_date}</span>}
                              </div>
                              {mySub ? (
                                <div className="stu-sub-status-box">
                                  {mySub.status === "Graded" ? (
                                    <>
                                      <span className="stu-sub-graded">✅ Graded: {mySub.grade}/{post.points}</span>
                                      {mySub.feedback && <span className="stu-sub-feedback">💬 {mySub.feedback}</span>}
                                    </>
                                  ) : (
                                    <span className="stu-sub-submitted">📬 Submitted</span>
                                  )}
                                </div>
                              ) : (
                                <button className="stu-submit-btn" onClick={() => { setSubmitModal({ post }); setSubmitContent(""); }}>
                                  Submit Assignment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ---- CLASSWORK ---- */}
              {classroomTab === "classwork" && (
                <div className="stu-classwork">
                  {/* Assignments */}
                  {assignmentPosts.length > 0 && (
                    <div className="stu-work-group">
                      <div className="cls-work-group-header">📝 Assignments</div>
                      {assignmentPosts.map(post => {
                        const mySub = mySubmissions[post.id];
                        return (
                          <div key={post.id} className="stu-work-item">
                            <div className="cls-work-item-left">
                              <span className="cls-work-icon">📝</span>
                              <div>
                                <strong>{post.title}</strong>
                                {post.due_date && <span className="cls-work-due">Due: {post.due_date}</span>}
                                {post.attachments && post.attachments.length > 0 && <span className="cls-work-due" style={{ color: "#1a73e8" }}>📎 {post.attachments.length} attachment{post.attachments.length > 1 ? 's' : ''}</span>}
                              </div>
                            </div>
                            <div className="stu-work-right">
                              {post.points > 0 && <span className="cls-pts">{post.points} pts</span>}
                              {mySub ? (
                                mySub.status === "Graded"
                                  ? <span className="stu-work-graded">✅ {mySub.grade}/{post.points}</span>
                                  : <span className="stu-work-done">📬 Submitted</span>
                              ) : (
                                <button className="stu-submit-btn-sm" onClick={() => { setSubmitModal({ post }); setSubmitContent(""); }}>Submit</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Materials */}
                  {materialPosts.length > 0 && (
                    <div className="stu-work-group">
                      <div className="cls-work-group-header">📄 Materials</div>
                      {materialPosts.map(post => (
                        <div key={post.id} className="stu-work-item">
                          <div className="cls-work-item-left">
                            <span className="cls-work-icon">📄</span>
                            <div>
                              <strong>{post.title}</strong>
                              {post.description && <span className="cls-work-due">{post.description.substring(0, 60)}...</span>}
                            </div>
                          </div>
                          <div className="stu-work-right">
                            <span className="stu-work-done">📘 Material</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {posts.length === 0 && <div className="cls-empty">No classwork posted yet.</div>}
                </div>
              )}
            </div>
          );
        }

        // My classes list
        return (
          <div className="stu-cls-home">
            <div className="cls-home-header">
              <h3>My Classrooms</h3>
              <button className="stu-join-btn" onClick={() => setShowJoinModal(true)}>+ Join Class</button>
            </div>

            {classrooms.length === 0 ? (
              <div className="cls-empty-state">
                <div className="cls-empty-icon">🏫</div>
                <h3>No classrooms yet</h3>
                <p>Ask your teacher for a class code and join a classroom</p>
                <button className="stu-join-btn" onClick={() => setShowJoinModal(true)}>+ Join Class</button>
              </div>
            ) : (
              <div className="cls-cards-grid">
                {classrooms.map(cls => (
                  <div key={cls.id} className="cls-card" onClick={() => openClassroom(cls)}>
                    <div className="cls-card-banner" style={{ background: cls.banner_color }}>
                      <h3>{cls.name}</h3>
                      <p>{cls.subject} {cls.section && `· ${cls.section}`}</p>
                    </div>
                    <div className="cls-card-body">
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>👨‍🏫 {cls.faculty_name}</span>
                    </div>
                    <div className="cls-card-footer">
                      <button className="cls-open-btn">Open →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "leaves":
        return (
          <div className="section-box">
            <h3>📝 Leave Applications</h3>
            <form className="std-form" onSubmit={handleLeaveSubmit} style={{ marginBottom: "20px", background: "#f8fafc", padding: "15px", borderRadius: "10px" }}>
              <h4 style={{ marginTop: 0 }}>{editingLeaveId ? "Edit Leave" : "Apply for New Leave"}</h4>
              <div style={{ display: "flex", gap: "10px" }}>
                <input type="text" placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required style={{ flex: 2 }} />
                <input type="date" value={leaveForm.date} onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })} required style={{ flex: 1 }} />
                <button className="primary-btn" type="submit">{editingLeaveId ? "Update" : "Apply"}</button>
                {editingLeaveId && <button type="button" onClick={() => { setEditingLeaveId(null); setLeaveForm({ reason: "", date: "" }); }} className="cancel-btn">Cancel</button>}
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
            <div className="std-form" style={{ background: "#fff5f5", padding: "20px", borderRadius: "10px", marginBottom: "30px", border: "1px solid #fee2e2" }}>
              <h4 style={{ marginTop: 0, color: "#991b1b" }}>{editingComplaintId ? "Edit Complaint" : "Report an Issue"}</h4>
              <select value={complaintForm.category} onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })} style={{ marginBottom: "10px" }}>
                <option value="">Select Category</option>
                <option value="Cleanliness">Cleanliness</option>
                <option value="Lab">Lab Issue</option>
                <option value="Other">Other</option>
              </select>
              <textarea rows="3" placeholder="Describe..." value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}></textarea>
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button className="primary-btn" onClick={handleComplaintSubmit} style={{ background: "#ef4444" }}>{editingComplaintId ? "Update" : "Submit"}</button>
                {editingComplaintId && <button onClick={() => { setEditingComplaintId(null); setComplaintForm({ category: "", description: "" }); }} className="cancel-btn">Cancel</button>}
              </div>
            </div>
            <table className="std-table">
              <thead><tr><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {myComplaints.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.category}</strong></td><td>{c.description}</td>
                    <td><span className={`status ${c.status.toLowerCase() === "open" ? "rejected" : "approved"}`}>{c.status}</span></td>
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
          <button className={activeTab === "classroom" ? "active" : ""} onClick={() => { setActiveTab("classroom"); fetchMyClassrooms(studentId); }}>Classroom</button>
          <button className={activeTab === "leaves" ? "active" : ""} onClick={() => setActiveTab("leaves")}>Leaves</button>
          <button className={activeTab === "complaints" ? "active" : ""} onClick={() => setActiveTab("complaints")}>Complaints</button>
        </nav>
        <button className="logout-link" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="std-main">{renderContent()}</main>

      {/* ====== JOIN CLASS MODAL ====== */}
      {showJoinModal && (
        <div className="cls-modal-overlay">
          <div className="cls-modal">
            <h2>Join a Class</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>Ask your teacher for the class code and enter it below.</p>
            <form onSubmit={handleJoin}>
              <div className="cls-form-group">
                <label>Class Code</label>
                <input
                  placeholder="e.g. AB12CD"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  style={{ textTransform: "uppercase", letterSpacing: "4px", fontSize: "18px", textAlign: "center" }}
                  maxLength={6}
                  required
                />
              </div>
              <div className="cls-modal-actions">
                <button type="button" className="cls-cancel-btn" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button type="submit" className="cls-submit-btn" disabled={joinLoading}>{joinLoading ? "Joining..." : "Join Class"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== SUBMIT ASSIGNMENT MODAL ====== */}
      {submitModal && (
        <div className="cls-modal-overlay">
          <div className="cls-modal">
            <h2>📝 Submit Assignment</h2>
            <div className="cls-sub-answer-box" style={{ marginBottom: "16px" }}>
              <label>Assignment</label>
              <p style={{ fontWeight: 600, color: "#111827" }}>{submitModal.post.title}</p>
              {submitModal.post.description && <p style={{ marginTop: "6px", color: "#6b7280", fontSize: "13px" }}>{submitModal.post.description}</p>}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="cls-form-group">
                <label>Your Answer / Work</label>
                <textarea
                  rows="5"
                  placeholder={submitFiles.length > 0 ? "Add a comment (optional)..." : "Type your answer here..."}
                  value={submitContent}
                  onChange={e => setSubmitContent(e.target.value)}
                  required={submitFiles.length === 0}
                />
              </div>
              <div className="cls-form-group">
                <label>Attach Files (optional)</label>
                <input type="file" multiple onChange={e => {
                  const files = Array.from(e.target.files);
                  if (files.length > 5) {
                    alert('Maximum 5 files allowed');
                    e.target.value = '';
                    return;
                  }
                  setSubmitFiles(files);
                }} accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" />
                {submitFiles.length > 0 && <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>{submitFiles.length} file(s) selected</span>}
              </div>
              <div className="cls-modal-actions">
                <button type="button" className="cls-cancel-btn" onClick={() => setSubmitModal(null)}>Cancel</button>
                <button type="submit" className="cls-submit-btn" disabled={uploading}>
                  {uploading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== FILE PREVIEW MODAL ====== */}
      {previewFile && (
        <div className="cls-modal-overlay" onClick={() => setPreviewFile(null)} style={{ zIndex: 3000 }}>
          <div className="cls-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="cls-preview-header">
              <h3 style={{ margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1, paddingRight: "20px" }}>{previewFile.name}</h3>
              <button className="cls-close-btn" onClick={() => setPreviewFile(null)}>✕</button>
            </div>
            <div className="cls-preview-body">
              {previewFile.type === "image" && <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", margin: "0 auto" }} />}
              {previewFile.type === "video" && <video src={previewFile.url} controls style={{ maxWidth: "100%", maxHeight: "70vh", display: "block", margin: "0 auto" }} />}
              {previewFile.type === "pdf" && <iframe src={previewFile.url} title={previewFile.name} style={{ width: "100%", height: "70vh", border: "none" }} />}
              {previewFile.type === "document" && (
                <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.url)}`} title={previewFile.name} style={{ width: "100%", height: "70vh", border: "none" }} />
              )}
            </div>
            <div className="cls-preview-footer">
              <a href={previewFile.url} target="_blank" rel="noreferrer" download className="cls-download-btn">⬇️ Download File</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;