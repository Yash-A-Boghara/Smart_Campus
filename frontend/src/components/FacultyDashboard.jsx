import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./FacultyDashboard.css";
import "./FacultyClassroom.css";

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [facultyName, setFacultyName] = useState("Faculty");
  const [facultyId, setFacultyId] = useState("");

  // Assignments (old/legacy)
  const [assignments, setAssignments] = useState([]);

  const [classrooms, setClassrooms] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [activeClassroom, setActiveClassroom] = useState(null);
  const [classroomTab, setClassroomTab] = useState("stream"); // stream | classwork | people
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [coTeachers, setCoTeachers] = useState([]);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postType, setPostType] = useState("Announcement");
  const [postFiles, setPostFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [gradeModal, setGradeModal] = useState(null); // { submission }
  const [submissionsModal, setSubmissionsModal] = useState(null); // { post, submissions }

  // Form states
  const [classForm, setClassForm] = useState({ name: "", subject: "", section: "", room: "" });
  const [postForm, setPostForm] = useState({ title: "", description: "", points: "", due_date: "" });
  const [gradeForm, setGradeForm] = useState({ grade: "", feedback: "" });
  const [enrollForm, setEnrollForm] = useState({ className: "", batch: "All" });
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    const id = localStorage.getItem("userId");
    if (name) setFacultyName(name);
    if (id) setFacultyId(id);
    fetchData(id);
  }, []);

  const fetchData = async (id) => {
    try {
      const res = await fetch("http://localhost:5000/api/assignments");
      setAssignments(await res.json());
    } catch (e) {}

    try {
      const res = await fetch("http://localhost:5000/api/available-classes");
      setAvailableClasses(await res.json());
    } catch (e) {}

    if (id) fetchClassrooms(id);
  };

  const fetchClassrooms = async (id) => {
    try {
      const fid = id || facultyId;
      const res = await fetch(`http://localhost:5000/api/classrooms?faculty_id=${fid}`);
      setClassrooms(await res.json());
    } catch (e) {}
  };

  const fetchPosts = async (classroomId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/classroom-posts/${classroomId}`);
      setPosts(await res.json());
    } catch (e) {}
  };

  const fetchPeople = async (classroomId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/classrooms/${classroomId}/people`);
      setPeople(await res.json());
    } catch (e) {}
  };

  const fetchCoTeachers = async (classroomId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/classrooms/${classroomId}/co-teachers`);
      setCoTeachers(await res.json());
    } catch (e) {}
  };

  const openClassroom = (cls) => {
    setActiveClassroom(cls);
    setClassroomTab("stream");
    fetchPosts(cls.id);
    fetchPeople(cls.id);
    fetchCoTeachers(cls.id);
  };

  // --- CREATE CLASSROOM ---
  const handleCreateClass = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/api/classrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...classForm, faculty_id: facultyId, faculty_name: facultyName }),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreateClass(false);
      setClassForm({ name: "", subject: "", section: "", room: "" });
      fetchClassrooms();
    } else alert(data.message);
  };

  // --- JOIN CLASSROOM AS CO-TEACHER ---
  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return alert("Please enter a class code");
    setJoining(true);
    try {
      const res = await fetch("http://localhost:5000/api/classrooms/faculty-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_code: joinCode.trim(),
          faculty_id: facultyId,
          faculty_name: facultyName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowJoinClass(false);
        setJoinCode("");
        fetchClassrooms(facultyId);
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error joining classroom. Please try again.");
    }
    setJoining(false);
  };

  // --- DELETE CLASSROOM ---
  const handleDeleteClass = async (id) => {
    if (!window.confirm("Delete this classroom? All posts and submissions will be lost.")) return;
    await fetch(`http://localhost:5000/api/classrooms/${id}`, { method: "DELETE" });
    if (activeClassroom?.id === id) setActiveClassroom(null);
    fetchClassrooms();
  };

  // --- LEAVE CLASSROOM (co-teacher leaves) ---
  const handleLeaveClass = async (cls) => {
    if (!window.confirm(`Leave "${cls.name}"? You will no longer be a co-teacher.`)) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/classrooms/${cls.id}/co-teachers/${facultyId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        if (activeClassroom?.id === cls.id) setActiveClassroom(null);
        fetchClassrooms(facultyId);
      } else {
        alert("Failed to leave: " + data.message);
      }
    } catch (e) {
      alert("Error leaving classroom.");
    }
  };

  // --- REMOVE STUDENT FROM CLASSROOM ---
  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Remove "${studentName}" from this classroom?`)) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/classrooms/${activeClassroom.id}/students/${studentId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        fetchPeople(activeClassroom.id);
      } else {
        alert("Failed to remove student: " + data.message);
      }
    } catch (e) {
      alert("Error removing student.");
    }
  };

  // --- REMOVE CO-TEACHER (owner only) ---
  const handleRemoveCoTeacher = async (coFacultyId, coFacultyName) => {
    if (!window.confirm(`Remove "${coFacultyName}" as co-teacher?`)) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/classrooms/${activeClassroom.id}/co-teachers/${coFacultyId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        fetchCoTeachers(activeClassroom.id);
      } else {
        alert("Failed to remove co-teacher: " + data.message);
      }
    } catch (e) {
      alert("Error removing co-teacher.");
    }
  };

  // --- AUTO ENROLL STUDENTS ---
  const handleAutoEnroll = async (e) => {
    e.preventDefault();
    if (!enrollForm.className) return alert("Please enter a class name");
    setEnrolling(true);
    try {
      const res = await fetch(`http://localhost:5000/api/classrooms/${activeClassroom.id}/auto-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_name: enrollForm.className, batch: enrollForm.batch })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchPeople(activeClassroom.id);
        setEnrollForm({ className: "", batch: "All" });
      }
    } catch (err) {
      alert("Error auto-enrolling students");
    }
    setEnrolling(false);
  };

  // --- POST (Announcement / Assignment / Material) ---
  const handlePost = async (e) => {
    e.preventDefault();
    setUploading(true);
    let attachments = [];

    if (postFiles.length > 0) {
      const formData = new FormData();
      postFiles.forEach(file => formData.append("files", file));
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
      classroom_id: activeClassroom.id,
      type: postType,
      title: postForm.title,
      description: postForm.description,
      points: postForm.points ? parseInt(postForm.points) : 0,
      due_date: postForm.due_date,
      faculty_id: facultyId,
      attachments
    };

    let res;
    if (editingPostId) {
      res = await fetch(`http://localhost:5000/api/classroom-posts/${editingPostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postForm.title,
          description: postForm.description,
          points: postForm.points ? parseInt(postForm.points) : 0,
          due_date: postForm.due_date
        }),
      });
    } else {
      res = await fetch("http://localhost:5000/api/classroom-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setShowPostModal(false);
      setEditingPostId(null);
      setPostForm({ title: "", description: "", points: "", due_date: "" });
      setPostFiles([]);
      fetchPosts(activeClassroom.id);
    } else alert(data.message);
  };

  const handleEditClick = (post) => {
    setPostType(post.type);
    setPostForm({
      title: post.title,
      description: post.description || "",
      points: post.points || "",
      due_date: post.due_date || ""
    });
    setEditingPostId(post.id);
    setPostFiles([]);
    setShowPostModal(true);
  };

  // --- DELETE POST ---
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    await fetch(`http://localhost:5000/api/classroom-posts/${postId}`, { method: "DELETE" });
    fetchPosts(activeClassroom.id);
  };

  // --- VIEW SUBMISSIONS ---
  const openSubmissions = async (post) => {
    const res = await fetch(`http://localhost:5000/api/submissions/${post.id}`);
    const subs = await res.json();
    setSubmissionsModal({ post, submissions: subs });
  };

  // --- GRADE SUBMISSION ---
  const handleGrade = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:5000/api/submissions/${gradeModal.submission.id}/grade`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: parseInt(gradeForm.grade), feedback: gradeForm.feedback }),
    });
    const data = await res.json();
    if (data.success) {
      setGradeModal(null);
      setGradeForm({ grade: "", feedback: "" });
      openSubmissions(submissionsModal.post);
    } else alert(data.message);
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };
  const goToCounselor = () => navigate("/counselor");

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
  const postTypeIcon = { Announcement: "📢", Assignment: "📝", Material: "📄" };
  const postTypeBadgeClass = { Announcement: "badge-ann", Assignment: "badge-asgn", Material: "badge-mat" };

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="cls-attachments-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
        {attachments.map((att, idx) => {
          const isImg = att.file_type === "image";
          return (
            <div key={idx} className="cls-attachment" onClick={() => setPreviewFile({ url: att.file_url, name: att.file_name, type: att.file_type })} style={{ cursor: "pointer", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px", display: "flex", alignItems: "center", gap: "10px", background: "#f9fafb", minWidth: "200px", maxWidth: "100%" }}>
              {isImg ? <img src={att.file_url} alt={att.file_name} style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} /> : <span style={{ fontSize: "24px" }}>{att.file_type === 'video' ? '🎥' : att.file_type === 'pdf' ? '📕' : '📄'}</span>}
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.file_name}</span>
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
                <h2>Welcome, Prof. {facultyName}! 👨‍🏫</h2>
                <p>Manage your classroom and students efficiently.</p>
              </div>
            </div>
            <div className="stats-grid">
              <div className="card blue"><h3>My Classrooms</h3><p>{classrooms.length}</p></div>
              <div className="card purple"><h3>Posts Today</h3><p>{posts.length}</p></div>
              <div className="card green" onClick={goToCounselor} style={{ cursor: "pointer" }}>
                <h3>Counselor Actions</h3><p style={{ fontSize: "18px", marginTop: "5px" }}>Manage Leaves →</p>
              </div>
            </div>
          </>
        );

      case "classroom":
        // If inside a classroom
        if (activeClassroom) {
          const isOwner = !activeClassroom.is_co_teacher;
          return (
            <div className="cls-inner">
              {/* Classroom banner */}
              <div className="cls-banner" style={{ background: activeClassroom.banner_color }}>
                <button className="cls-back-btn" onClick={() => setActiveClassroom(null)}>← All Classes</button>
                <div className="cls-banner-info">
                  <h2>{activeClassroom.name}</h2>
                  <p>{activeClassroom.subject} {activeClassroom.section && `· ${activeClassroom.section}`} {activeClassroom.room && `· ${activeClassroom.room}`}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span className="cls-code-badge">Class code: <strong>{activeClassroom.class_code}</strong></span>
                    {activeClassroom.is_co_teacher && (
                      <span style={{ background: "rgba(255,255,255,0.25)", color: "#fff", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.5)" }}>
                        👥 Co-Teacher
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="cls-subtabs">
                {["stream", "classwork", "people"].map(t => (
                  <button key={t} className={`cls-subtab ${classroomTab === t ? "active" : ""}`}
                    onClick={() => { setClassroomTab(t); if (t === "people") { fetchPeople(activeClassroom.id); fetchCoTeachers(activeClassroom.id); } }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* ---- STREAM ---- */}
              {classroomTab === "stream" && (
                <div className="cls-stream">
                  {/* Post box */}
                  <div className="cls-post-box" onClick={() => { setEditingPostId(null); setPostForm({ title: "", description: "", points: "", due_date: "" }); setPostType("Announcement"); setShowPostModal(true); }}>
                    <div className="cls-avatar">{facultyName[0]}</div>
                    <div className="cls-post-placeholder">Announce something to your class…</div>
                  </div>

                  {/* Action buttons */}
                  <div className="cls-post-actions">
                    <button className="cls-action-btn asgn" onClick={() => { setEditingPostId(null); setPostForm({ title: "", description: "", points: "", due_date: "" }); setPostType("Assignment"); setShowPostModal(true); }}>📝 Assignment</button>
                    <button className="cls-action-btn mat" onClick={() => { setEditingPostId(null); setPostForm({ title: "", description: "", points: "", due_date: "" }); setPostType("Material"); setShowPostModal(true); }}>📄 Material</button>
                  </div>

                  {/* Feed */}
                  {posts.length === 0 ? (
                    <div className="cls-empty">No posts yet. Announce something!</div>
                  ) : (
                    posts.map(post => (
                      <div key={post.id} className="cls-feed-card">
                        <div className="cls-feed-header">
                          <div className="cls-feed-avatar" style={{ background: activeClassroom.banner_color }}>{activeClassroom.faculty_name?.[0] || facultyName[0]}</div>
                          <div>
                            <strong>{activeClassroom.faculty_name || facultyName}</strong>
                            <span className="cls-feed-time">{formatDate(post.created_at)}</span>
                          </div>
                          <span className={`cls-type-badge ${postTypeBadgeClass[post.type]}`}>{postTypeIcon[post.type]} {post.type}</span>
                          <button className="cls-del-post" onClick={() => handleEditClick(post)} title="Edit">✏️</button>
                          <button className="cls-del-post" onClick={() => handleDeletePost(post.id)} title="Delete">🗑️</button>
                        </div>
                        <h4 className="cls-feed-title">{post.title}</h4>
                        {post.description && <p className="cls-feed-desc">{post.description}</p>}
                        {renderAttachments(post.attachments)}
                        {post.type === "Assignment" && (
                          <div className="cls-feed-meta">
                            {post.points > 0 && <span>🏅 {post.points} pts</span>}
                            {post.due_date && <span>⏰ Due: {post.due_date}</span>}
                            <button className="cls-view-subs-btn" onClick={() => openSubmissions(post)}>👁 View Submissions</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ---- CLASSWORK ---- */}
              {classroomTab === "classwork" && (
                <div className="cls-classwork">
                  <div className="cls-classwork-header">
                    <h3>Classwork</h3>
                    <div className="cls-classwork-btns">
                      <button className="cls-action-btn asgn" onClick={() => { setPostType("Assignment"); setShowPostModal(true); }}>+ Assignment</button>
                      <button className="cls-action-btn mat" onClick={() => { setPostType("Material"); setShowPostModal(true); }}>+ Material</button>
                      <button className="cls-action-btn ann" onClick={() => { setPostType("Announcement"); setShowPostModal(true); }}>+ Announcement</button>
                    </div>
                  </div>
                  {["Assignment", "Material", "Announcement"].map(type => {
                    const typePosts = posts.filter(p => p.type === type);
                    if (typePosts.length === 0) return null;
                    return (
                      <div key={type} className="cls-work-group">
                        <div className="cls-work-group-header">{postTypeIcon[type]} {type}s</div>
                        {typePosts.map(post => (
                          <div key={post.id} className="cls-work-item">
                            <div className="cls-work-item-left">
                              <span className="cls-work-icon">{postTypeIcon[post.type]}</span>
                              <div>
                                <strong>{post.title}</strong>
                                {post.due_date && <span className="cls-work-due">Due: {post.due_date}</span>}
                                {post.attachments && post.attachments.length > 0 && <span className="cls-work-due" style={{ color: "#1a73e8" }}>📎 {post.attachments.length} attachment{post.attachments.length > 1 ? 's' : ''}</span>}
                              </div>
                            </div>
                            <div className="cls-work-item-right">
                              {post.points > 0 && <span className="cls-pts">{post.points} pts</span>}
                              {type === "Assignment" && (
                                <button className="cls-view-subs-btn" onClick={() => openSubmissions(post)}>View Submissions</button>
                              )}
                              <button className="cls-del-work" onClick={() => handleEditClick(post)} title="Edit">✏️</button>
                              <button className="cls-del-work" onClick={() => handleDeletePost(post.id)} title="Delete">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {posts.length === 0 && <div className="cls-empty">No classwork yet. Create an assignment or material.</div>}
                </div>
              )}

              {/* ---- PEOPLE ---- */}
              {classroomTab === "people" && (
                <div className="cls-people">
                  {/* Owner / Teachers section */}
                  <div className="cls-people-section">
                    <h4>Teachers</h4>
                    {/* Owner */}
                    <div className="cls-person-row">
                      <div className="cls-p-avatar" style={{ background: activeClassroom.banner_color }}>{activeClassroom.faculty_name?.[0] || facultyName[0]}</div>
                      <div>
                        <strong>{activeClassroom.faculty_name || facultyName}</strong>
                        <span className="cls-p-id">{activeClassroom.faculty_id}</span>
                      </div>
                      <span style={{ marginLeft: "auto", background: "#e8f0fe", color: "#1a73e8", padding: "2px 10px", borderRadius: "10px", fontSize: "12px", fontWeight: 600 }}>Owner</span>
                    </div>
                    {/* Co-teachers */}
                    {coTeachers.map(ct => (
                      <div key={ct.id} className="cls-person-row">
                        <div className="cls-p-avatar" style={{ background: "#6200ea" }}>{ct.faculty_name[0]}</div>
                        <div>
                          <strong>{ct.faculty_name}</strong>
                          <span className="cls-p-id">{ct.faculty_id}</span>
                        </div>
                        <span style={{ marginLeft: "auto", background: "#f3e8ff", color: "#6200ea", padding: "2px 10px", borderRadius: "10px", fontSize: "12px", fontWeight: 600 }}>Co-Teacher</span>
                        {/* Owner can remove co-teachers; co-teacher can only remove themselves */}
                        {(isOwner || ct.faculty_id === facultyId) && (
                          <button
                            className="cls-remove-student-btn"
                            style={{ marginLeft: "8px" }}
                            title={ct.faculty_id === facultyId ? "Leave this classroom" : "Remove co-teacher"}
                            onClick={() => ct.faculty_id === facultyId
                              ? handleLeaveClass(activeClassroom)
                              : handleRemoveCoTeacher(ct.faculty_id, ct.faculty_name)
                            }
                          >
                            {ct.faculty_id === facultyId ? "Leave" : "🗑️ Remove"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Auto-enroll section */}
                  <div className="cls-people-section" style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
                    <h4 style={{ marginTop: 0, marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                      ⚡ Auto-Enroll Students
                    </h4>
                    <form onSubmit={handleAutoEnroll} style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div className="cls-form-group" style={{ margin: 0, flex: 1, minWidth: "150px" }}>
                        <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Target Class</label>
                        <select
                          value={enrollForm.className}
                          onChange={e => setEnrollForm({ className: e.target.value, batch: "All" })}
                          required
                          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%" }}
                        >
                          <option value="" disabled>Select Class</option>
                          {availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="cls-form-group" style={{ margin: 0, width: "120px" }}>
                        <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Batch</label>
                        <select
                          value={enrollForm.batch}
                          onChange={e => setEnrollForm({ ...enrollForm, batch: e.target.value })}
                          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%" }}
                        >
                          <option value="All">All Batches</option>
                          {(!enrollForm.className || enrollForm.className.endsWith('1')) && (
                            <>
                              <option value="A1">A1</option>
                              <option value="B1">B1</option>
                              <option value="C1">C1</option>
                            </>
                          )}
                          {(!enrollForm.className || !enrollForm.className.endsWith('1')) && (
                            <>
                              <option value="A2">A2</option>
                              <option value="B2">B2</option>
                              <option value="C2">C2</option>
                            </>
                          )}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={enrolling}
                        style={{ padding: "8px 16px", background: activeClassroom.banner_color, color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: enrolling ? "not-allowed" : "pointer", height: "35px" }}
                      >
                        {enrolling ? "Adding..." : "+ Add Students"}
                      </button>
                    </form>
                  </div>

                  {/* Students list */}
                  <div className="cls-people-section">
                    <h4>Students <span className="cls-people-count">{people.length}</span></h4>
                    {people.length === 0 ? (
                      <div className="cls-empty">No students enrolled yet. Share the class code: <strong>{activeClassroom.class_code}</strong></div>
                    ) : (
                      <div className="cls-people-list">
                        {people.map(p => (
                          <div key={p.id} className="cls-person-row">
                            <div className="cls-p-avatar">{p.student_name[0]}</div>
                            <div className="cls-p-col cls-p-name-col">
                              <strong>{p.student_name}</strong>
                              <span className="cls-p-id">{p.student_id}</span>
                            </div>
                            <div className="cls-p-col cls-p-class-col">
                              <span className="cls-p-class">Class: {p.class_name}</span>
                            </div>
                            <div className="cls-p-col cls-p-batch-col">
                              <span className="cls-p-batch">Batch: {p.batch}</span>
                            </div>
                            <div className="cls-p-col cls-p-action-col">
                              <button
                                className="cls-remove-student-btn"
                                title="Remove student from classroom"
                                onClick={() => handleRemoveStudent(p.student_id, p.student_name)}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // My Classes list
        return (
          <div className="cls-home">
            <div className="cls-home-header">
              <h3>My Classrooms</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="cls-create-btn"
                  style={{ background: "#fff", color: "#1a73e8", border: "2px solid #1a73e8" }}
                  onClick={() => setShowJoinClass(true)}
                >
                  + Join Class
                </button>
                <button className="cls-create-btn" onClick={() => setShowCreateClass(true)}>+ Create Class</button>
              </div>
            </div>
            {classrooms.length === 0 ? (
              <div className="cls-empty-state">
                <div className="cls-empty-icon">🏫</div>
                <h3>No classrooms yet</h3>
                <p>Create your first classroom or join one with a code</p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
                  <button className="cls-create-btn" style={{ background: "#fff", color: "#1a73e8", border: "2px solid #1a73e8" }} onClick={() => setShowJoinClass(true)}>+ Join Class</button>
                  <button className="cls-create-btn" onClick={() => setShowCreateClass(true)}>+ Create Class</button>
                </div>
              </div>
            ) : (
              <div className="cls-cards-grid">
                {classrooms.map(cls => (
                  <div key={cls.id} className="cls-card" onClick={() => openClassroom(cls)}>
                    <div className="cls-card-banner" style={{ background: cls.banner_color }}>
                      {cls.is_co_teacher && (
                        <span style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(255,255,255,0.25)", color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, border: "1px solid rgba(255,255,255,0.5)" }}>
                          👥 Co-Teacher
                        </span>
                      )}
                      <h3>{cls.name}</h3>
                      <p>{cls.subject} {cls.section && `· ${cls.section}`}</p>
                    </div>
                    <div className="cls-card-body">
                      <span className="cls-card-code">Code: <strong>{cls.class_code}</strong></span>
                      {cls.room && <span className="cls-card-room">📍 {cls.room}</span>}
                      {cls.is_co_teacher && (
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>by {cls.faculty_name}</span>
                      )}
                    </div>
                    <div className="cls-card-footer">
                      <button className="cls-open-btn">Open →</button>
                      {cls.is_co_teacher ? (
                        <button className="cls-del-cls-btn" title="Leave classroom" onClick={(e) => { e.stopPropagation(); handleLeaveClass(cls); }}>🚪</button>
                      ) : (
                        <button className="cls-del-cls-btn" onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}>🗑️</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <div>Select Tab</div>;
    }
  };

  return (
    <div className="fac-container">
      <aside className="fac-sidebar">
        <div className="logo">🎓 FacultyPortal</div>
        <nav>
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={activeTab === "classroom" ? "active" : ""} onClick={() => { setActiveTab("classroom"); fetchClassrooms(facultyId); }}>Classroom</button>
          <div className="nav-divider" style={{ margin: "10px 0", borderTop: "1px solid #e2e8f0" }}></div>
          <button className="counselor-link" onClick={goToCounselor} style={{ color: "#059669" }}>🛡️ Counselor Panel</button>
        </nav>
        <button className="logout-link" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="fac-main">{renderContent()}</main>

      {/* ====== JOIN CLASS MODAL ====== */}
      {showJoinClass && (
        <div className="cls-modal-overlay">
          <div className="cls-modal">
            <h2>👥 Join a Classroom</h2>
            <p style={{ color: "#6b7280", marginBottom: "20px", fontSize: "14px" }}>
              Enter the class code shared by the classroom owner to join as a co-teacher with full permissions.
            </p>
            <form onSubmit={handleJoinClass}>
              <div className="cls-form-group">
                <label>Class Code *</label>
                <input
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  required
                  maxLength={8}
                  style={{ letterSpacing: "3px", fontWeight: 700, fontSize: "18px", textAlign: "center" }}
                  autoFocus
                />
              </div>
              <div className="cls-modal-actions">
                <button type="button" className="cls-cancel-btn" onClick={() => { setShowJoinClass(false); setJoinCode(""); }}>Cancel</button>
                <button type="submit" className="cls-submit-btn" disabled={joining}>
                  {joining ? "Joining..." : "Join Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== CREATE CLASS MODAL ====== */}
      {showCreateClass && (
        <div className="cls-modal-overlay">
          <div className="cls-modal">
            <h2>Create Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="cls-form-group">
                <label>Class Name *</label>
                <input placeholder="e.g. Engineering Mathematics" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} required />
              </div>
              <div className="cls-form-group">
                <label>Subject *</label>
                <input placeholder="e.g. DBMS, Networks" value={classForm.subject} onChange={e => setClassForm({ ...classForm, subject: e.target.value })} required />
              </div>
              <div className="cls-form-row">
                <div className="cls-form-group">
                  <label>Section</label>
                  <input placeholder="e.g. 3A" value={classForm.section} onChange={e => setClassForm({ ...classForm, section: e.target.value })} />
                </div>
                <div className="cls-form-group">
                  <label>Room</label>
                  <input placeholder="e.g. Lab 2" value={classForm.room} onChange={e => setClassForm({ ...classForm, room: e.target.value })} />
                </div>
              </div>
              <div className="cls-modal-actions">
                <button type="button" className="cls-cancel-btn" onClick={() => setShowCreateClass(false)}>Cancel</button>
                <button type="submit" className="cls-submit-btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== CREATE/EDIT POST MODAL ====== */}
      {showPostModal && (
        <div className="cls-modal-overlay">
          <div className="cls-modal cls-modal-wide">
            <h2>{editingPostId ? `✏️ Edit ${postType}` : `${postTypeIcon[postType]} ${postType === 'Announcement' ? 'Post Announcement' : 'Create ' + postType}`}</h2>
            <form onSubmit={handlePost}>
              {!editingPostId && (
                <div className="cls-post-type-tabs">
                  {["Announcement", "Assignment", "Material"].map(t => (
                    <button key={t} type="button" className={`cls-type-tab ${postType === t ? "active" : ""}`} onClick={() => setPostType(t)}>{postTypeIcon[t]} {t}</button>
                  ))}
                </div>
              )}
              <div className="cls-form-group">
                <label>Title *</label>
                <input placeholder={postType === "Announcement" ? "Share something with your class..." : `${postType} title`} value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} required />
              </div>
              <div className="cls-form-group">
                <label>Description / Instructions</label>
                <textarea rows="4" placeholder="Add details..." value={postForm.description} onChange={e => setPostForm({ ...postForm, description: e.target.value })} />
              </div>
              {postType === "Assignment" && (
                <div className="cls-form-row">
                  <div className="cls-form-group">
                    <label>Points</label>
                    <input type="number" min="0" placeholder="100" value={postForm.points} onChange={e => setPostForm({ ...postForm, points: e.target.value })} />
                  </div>
                  <div className="cls-form-group">
                    <label>Due Date</label>
                    <input type="date" min={new Date().toISOString().split("T")[0]} value={postForm.due_date} onChange={e => setPostForm({ ...postForm, due_date: e.target.value })} />
                  </div>
                </div>
              )}
              {!editingPostId && (
                <div className="cls-form-group">
                  <label>Attach Files (optional)</label>
                  <input type="file" multiple onChange={e => {
                    const files = Array.from(e.target.files);
                    if (files.length > 5) {
                      alert('Maximum 5 files allowed');
                      e.target.value = '';
                      return;
                    }
                    setPostFiles(files);
                  }} accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" />
                  {postFiles.length > 0 && <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>{postFiles.length} file(s) selected</span>}
                </div>
              )}
              
              <div className="cls-modal-actions">
                <button type="button" className="cls-cancel-btn" onClick={() => { setShowPostModal(false); setEditingPostId(null); setPostForm({ title: "", description: "", points: "", due_date: "" }); }}>Cancel</button>
                <button type="submit" className="cls-submit-btn" disabled={uploading}>
                  {uploading ? "Saving..." : (editingPostId ? "Save Changes" : "Post")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== SUBMISSIONS MODAL ====== */}
      {submissionsModal && (
        <div className="cls-modal-overlay">
          <div className="cls-modal cls-modal-wide">
            <h2>📋 Submissions — {submissionsModal.post.title}</h2>
            <p className="cls-subs-meta">{submissionsModal.submissions.length} submission{submissionsModal.submissions.length !== 1 ? "s" : ""} · {submissionsModal.post.points} pts</p>
            {submissionsModal.submissions.length === 0 ? (
              <div className="cls-empty">No submissions yet.</div>
            ) : (
              <table className="cls-subs-table">
                <thead><tr><th>Student</th><th>Answer</th><th>Status</th><th>Grade</th><th>Action</th></tr></thead>
                <tbody>
                  {submissionsModal.submissions.map(sub => (
                    <tr key={sub.id}>
                      <td><strong>{sub.student_name}</strong><br /><small>{sub.student_id}</small></td>
                      <td className="cls-sub-content">
                        {sub.content && <span>{sub.content}</span>}
                        {renderAttachments(sub.attachments)}
                        {(!sub.content && (!sub.attachments || sub.attachments.length === 0)) && "—"}
                      </td>
                      <td><span className={`cls-sub-status ${sub.status.toLowerCase()}`}>{sub.status}</span></td>
                      <td>{sub.grade !== null && sub.grade !== undefined ? `${sub.grade} / ${submissionsModal.post.points}` : "—"}</td>
                      <td>
                        <button className="cls-grade-btn" onClick={() => { setGradeModal({ submission: sub }); setGradeForm({ grade: sub.grade || "", feedback: sub.feedback || "" }); }}>
                          {sub.status === "Graded" ? "Re-grade" : "Grade"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="cls-modal-actions" style={{ marginTop: "20px" }}>
              <button className="cls-cancel-btn" onClick={() => setSubmissionsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== GRADE MODAL ====== */}
      {gradeModal && (
        <div className="cls-modal-overlay">
          <div className="cls-modal">
            <h2>Grade Submission</h2>
            <p><strong>{gradeModal.submission.student_name}</strong> ({gradeModal.submission.student_id})</p>
            {gradeModal.submission.content && (
              <div className="cls-sub-answer-box">
                <label>Student's Answer</label>
                <p>{gradeModal.submission.content}</p>
                {renderAttachments(gradeModal.submission.attachments)}
              </div>
            )}
            <form onSubmit={handleGrade}>
              <div className="cls-form-row">
                <div className="cls-form-group">
                  <label>Grade (out of {submissionsModal?.post.points || "?"})</label>
                  <input type="number" min="0" max={submissionsModal?.post.points} placeholder="e.g. 85" value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} required />
                </div>
              </div>
              <div className="cls-form-group">
                <label>Feedback (optional)</label>
                <textarea rows="3" placeholder="Great work! or suggestions..." value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
              </div>
              <div className="cls-modal-actions">
                <button type="button" className="cls-cancel-btn" onClick={() => setGradeModal(null)}>Cancel</button>
                <button type="submit" className="cls-submit-btn">Save Grade</button>
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

export default FacultyDashboard;