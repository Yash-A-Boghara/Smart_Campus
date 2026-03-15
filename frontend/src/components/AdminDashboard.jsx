import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";


// ─── AUTO-SECTION PREVIEW (mirrors backend logic) ─────────────────────────
const parseStudentId = (enrollmentId) => {
  if (!enrollmentId) return { valid: false, hasInput: false, reason: 'empty' };
  const id = enrollmentId.toUpperCase().trim();
  const match = id.match(/^(\d{2})[A-Z]?([A-Z]{2})(\d{3,})$/);
  if (!match) return { valid: false, hasInput: true, reason: 'format' };
  
  const adminYear = parseInt(match[1], 10);
  const branch = match[2];
  const roll = parseInt(match[3], 10);

  const deptMap = {
    'CE': 'Computer Engineering',
    'CS': 'Computer Science Engineering',
    'IT': 'Information Technology',
    'ME': 'Mechanical Engineering',
    'EC': 'Electronics & Communication'
  };

  if (!deptMap[branch]) return { valid: false, hasInput: true, reason: 'branch' };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100; // e.g., 2026 -> 26
  const currentMonth = currentDate.getMonth() + 1; // 1-12 (June is 6)

  // Prevent registering the upcoming batch before June
  if (adminYear > currentYear || (adminYear === currentYear && currentMonth < 6)) {
    return { valid: false, hasInput: true, department: deptMap[branch], reason: 'future_batch', adminYear };
  }

  // Prevent registering batches that have already graduated (more than 4 years ago)
  if (adminYear < currentYear - 4) {
    return { valid: false, hasInput: true, department: deptMap[branch], reason: 'year' };
  }

  let semester = (currentYear - adminYear) * 2 + (currentMonth >= 6 ? 1 : 0);
  if (semester < 1) semester = 1;
  if (semester > 8) semester = 8; // Max 8 semesters

  let section = null;
  if (roll >= 1 && roll <= 74) section = `${semester}${branch}1`;
  else if (roll >= 75 && roll <= 150) section = `${semester}${branch}2`;
  else return { valid: false, hasInput: true, department: deptMap[branch], reason: 'roll' };

  return { valid: true, hasInput: true, department: deptMap[branch], class: section };
};

// Thin wrappers so the existing call-sites on lines 80-81 work correctly
const assignClass = (enrollmentId) => {
  const parsed = parseStudentId(enrollmentId);
  return parsed.valid ? parsed.class : null;
};

const assignDepartment = (enrollmentId) => {
  const parsed = parseStudentId(enrollmentId);
  return parsed.valid || parsed.department ? parsed.department : null;
};

const assignBatch = (enrollmentId) => {
  if (!enrollmentId) return null;
  const id = enrollmentId.toUpperCase().trim();
  const match = id.match(/^(\d{2})[A-Z]?([A-Z]{2})(\d{3,})$/);
  if (!match) return null;
  const roll = parseInt(match[3], 10);
  if (roll >= 1 && roll <= 25) return 'A1';
  if (roll >= 26 && roll <= 50) return 'B1';
  if (roll >= 51 && roll <= 75) return 'C1';
  if (roll >= 76 && roll <= 100) return 'A2';
  if (roll >= 101 && roll <= 125) return 'B2';
  if (roll >= 126 && roll <= 150) return 'C2';
  return null;
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterRole, setFilterRole] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [filterBatch, setFilterBatch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form Data State
  const [formData, setFormData] = useState({
    custom_id: "",
    full_name: "",
    password: "",
    role: "Student",
    department: "",
    phone: "",
    class: ""
  });

  const navigate = useNavigate();

  // Live class & department preview when adding a student
  const classPreview = formData.role === "Student" ? assignClass(formData.custom_id) : null;
  const deptPreview = formData.role === "Student" ? assignDepartment(formData.custom_id) : null;

  // Guard: detect if admin is trying to register a current-year student before June
  const earlyAdmissionError = (() => {
    if (formData.role !== "Student") return null;
    const match = formData.custom_id.match(/^(\d{2})D[A-Z]{2,3}\d{3}$/);
    if (!match) return null;
    const admissionYear = parseInt(match[1], 10);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const isBeforeJune = now.getMonth() < 5;
    if (admissionYear === currentYear && isBeforeJune) {
      return `⚠️ Cannot register ${currentYear + 2000} batch students before June. Admissions open in June.`;
    }
    return null;
  })();

  // Fetch users on load
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users");
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // --- HANDLERS ---
  
  const handleAddNew = () => {
    setFormData({ custom_id: "", full_name: "", password: "", role: "Student", department: "", phone: "", class: "" });
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setFormData(user); 
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto-fill department based on ID
    if (name === "custom_id" && value && formData.role === "Student") {
      const parsed = parseStudentId(value);
      if (parsed.valid) {
        newFormData.department = parsed.department;
      } else {
        newFormData.department = ""; // clear if invalid
      }
    }

    setFormData(newFormData);
  };

  // --- FIXED: HANDLE SUBMIT BUTTON ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission if Student ID is invalid
    if (formData.role === "Student") {
      const parsed = parseStudentId(formData.custom_id);
      if (!parsed.valid) {
        alert("Please enter a valid Student ID before saving. Review the red warnings in the form.");
        return;
      }
    }

    try {
      const url = isEditMode 
        ? `http://localhost:5000/api/users/${formData.custom_id}` 
        : "http://localhost:5000/api/users";
      
      const method = isEditMode ? "PUT" : "POST";

      // IMPORTANT FIX: Remove '_id' before sending to backend
      // MongoDB does not allow updating the immutable '_id' field.
      const { _id, ...submitData } = formData;

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setShowModal(false);
        fetchUsers(); // Refresh Table immediately
      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error("API Error", error);
      alert("Failed to connect to server. Did you restart 'node server.js'?");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete user ${id}?`)) {
      await fetch(`http://localhost:5000/api/users/${id}`, { method: "DELETE" });
      fetchUsers();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Stats Logic
  const totalStudents = users.filter(u => u.role === "Student").length;
  const totalFaculty = users.filter(u => u.role === "Faculty").length;
  const totalLibrarians = users.filter(u => u.role === "Librarian").length;
  const totalPeons = users.filter(u => u.role === "Peon").length;

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <div className="stats-grid">
              <div className="card blue"><h3>Total Users</h3><p>{users.length}</p></div>
              <div className="card green"><h3>Students</h3><p>{totalStudents}</p></div>
              <div className="card purple"><h3>Faculty</h3><p>{totalFaculty}</p></div>
              <div className="card orange"><h3>Librarians</h3><p>{totalLibrarians}</p></div>
              <div className="card red"><h3>Peons</h3><p>{totalPeons}</p></div>
            </div>
            <div className="table-section">
              <h3>Recent Registrations</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>ID</th><th>Name</th><th>Role</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map((user) => (
                      <tr key={user._id}>
                        <td><strong>{user.custom_id}</strong></td>
                        <td>{user.full_name}</td>
                        <td><span className={`badge ${user.role ? user.role.toLowerCase() : 'student'}`}>{user.role}</span></td>
                        <td><button className="edit-btn" onClick={() => handleEdit(user)}>Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );

      case "manage-users": {
        const roles = ["All", "Student", "Faculty", "Admin", "Librarian", "Peon"];
        const roleIcons = { All: "👥", Student: "🎓", Faculty: "👨‍🏫", Admin: "⚡", Librarian: "📚", Peon: "🧹" };

        // All unique class values from students, sorted
        const allClasses = [...new Set(
          users.filter(u => u.role === "Student" && u.class).map(u => u.class)
        )].sort();

        // Color palette for each class — cycles through colors
        const CLASS_COLORS = [
          { bg: "#dbeafe", text: "#1d4ed8" }, // blue
          { bg: "#dcfce7", text: "#15803d" }, // green
          { bg: "#ede9fe", text: "#6d28d9" }, // purple
          { bg: "#fef9c3", text: "#92400e" }, // yellow
          { bg: "#fee2e2", text: "#b91c1c" }, // red
          { bg: "#ffedd5", text: "#c2410c" }, // orange
          { bg: "#e0f2fe", text: "#0369a1" }, // sky
          { bg: "#fce7f3", text: "#be185d" }, // pink
        ];
        const getClassColor = (cls) => {
          const idx = allClasses.indexOf(cls);
          return idx >= 0 ? CLASS_COLORS[idx % CLASS_COLORS.length] : { bg: "#f3f4f6", text: "#6b7280" };
        };

        // Batch color map for filter tabs
        const BATCH_COLORS = {
          'A1': { bg: '#dbeafe', text: '#1e40af' },
          'B1': { bg: '#dcfce7', text: '#166534' },
          'C1': { bg: '#fef3c7', text: '#92400e' },
          'A2': { bg: '#ede9fe', text: '#5b21b6' },
          'B2': { bg: '#fee2e2', text: '#991b1b' },
          'C2': { bg: '#ffedd5', text: '#c2410c' }
        };
        const ALL_BATCHES = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'];

        // Apply search + role + class + batch filter
        const filtered = users.filter((u) => {
          const matchRole = filterRole === "All" || u.role === filterRole;
          const matchClass = filterClass === "All" || u.class === filterClass;
          const matchBatch = filterBatch === "All" || (u.batch || assignBatch(u.custom_id)) === filterBatch;
          const q = searchQuery.toLowerCase();
          const matchSearch =
            !q ||
            (u.full_name || "").toLowerCase().includes(q) ||
            (u.custom_id || "").toLowerCase().includes(q) ||
            (u.department || "").toLowerCase().includes(q);
          return matchRole && matchSearch && matchClass && matchBatch;
        }).sort((a, b) => (a.custom_id || "").localeCompare(b.custom_id || ""));


        // Group by role for "All" view
        const groupedRoles = filterRole === "All"
          ? ["Student", "Faculty", "Admin", "Librarian", "Peon"]
          : [filterRole];

        const UserTable = ({ userList }) => (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Class / Section</th>
                  <th>Batch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", color: "#999", padding: "1.5rem" }}>No users found</td></tr>
                ) : (
                  userList.map((user) => (
                    <tr key={user.custom_id}>
                      <td><strong>{user.custom_id}</strong></td>
                      <td>{user.full_name}</td>
                      <td>{user.department || "—"}</td>
                      <td>
                        {user.role === "Student" && user.class
                          ? (() => {
                              const { bg, text } = getClassColor(user.class);
                              return (
                                <span style={{
                                  background: bg,
                                  color: text,
                                  borderRadius: "6px",
                                  padding: "3px 10px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  border: `1px solid ${text}33`,
                                  whiteSpace: "nowrap"
                                }}>
                                  {user.class}
                                </span>
                              );
                            })()
                          : <span style={{ color: "#9ca3af" }}>—</span>
                        }
                      </td>
                      <td>
                        {(() => {
                          const batch = user.batch || (user.role === "Student" ? assignBatch(user.custom_id) : null);
                          if (!batch) return <span style={{ color: '#9ca3af' }}>—</span>;
                          const { bg, text } = BATCH_COLORS[batch] || { bg: '#f3f4f6', text: '#6b7280' };
                          return (
                            <span style={{
                              background: bg,
                              color: text,
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              border: `1px solid ${text}33`,
                              whiteSpace: 'nowrap'
                            }}>
                              {batch}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <button className="edit-btn" onClick={() => handleEdit(user)}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(user.custom_id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

        return (
          <div className="table-section">
            {/* Header */}
            <div className="section-header">
              <h3>Manage Users <span style={{ fontWeight: 400, fontSize: "0.9rem", color: "#888" }}>({filtered.length} found)</span></h3>
              <button className="add-btn" onClick={handleAddNew}>+ Add New User</button>
            </div>

            {/* Search Bar */}
            <div className="user-search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, ID, email or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>

            {/* Role Filter Tabs */}
            <div className="role-filter-tabs">
              {roles.map((role) => {
                const count = role === "All" ? users.length : users.filter(u => u.role === role).length;
                return (
                  <button
                    key={role}
                    className={`role-tab ${filterRole === role ? "active" : ""} role-tab-${role.toLowerCase()}`}
                    onClick={() => { setFilterRole(role); setFilterClass("All"); setFilterBatch("All"); }}
                  >
                    <span>{roleIcons[role]}</span>
                    <span>{role}</span>
                    <span className="role-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Class Filter Tabs — only visible when Students tab is active */}
            {(filterRole === "Student" || filterRole === "All") && allClasses.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0 4px" }}>
                <button
                  onClick={() => setFilterClass("All")}
                  style={{
                    padding: "4px 14px", borderRadius: "20px", border: "1.5px solid #e5e7eb",
                    background: filterClass === "All" ? "#1a73e8" : "white",
                    color: filterClass === "All" ? "white" : "#374151",
                    fontWeight: 600, fontSize: "12px", cursor: "pointer"
                  }}
                >
                  All Classes
                </button>
                {allClasses.map(cls => {
                  const { bg, text } = getClassColor(cls);
                  const isActive = filterClass === cls;
                  const count = users.filter(u => u.class === cls).length;
                  return (
                    <button
                      key={cls}
                      onClick={() => setFilterClass(cls)}
                      style={{
                        padding: "4px 14px", borderRadius: "20px", cursor: "pointer",
                        border: `1.5px solid ${isActive ? text : "#e5e7eb"}`,
                        background: isActive ? bg : "white",
                        color: isActive ? text : "#374151",
                        fontWeight: isActive ? 700 : 500,
                        fontSize: "12px",
                        transition: "all 0.15s"
                      }}
                    >
                      {cls}
                      <span style={{ marginLeft: "6px", background: isActive ? text : "#e5e7eb", color: isActive ? bg : "#374151", borderRadius: "10px", padding: "1px 6px", fontSize: "11px", fontWeight: 700 }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Batch Filter Tabs — only visible when Students tab is active */}
            {(filterRole === "Student" || filterRole === "All") && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0 16px" }}>
                <button
                  onClick={() => setFilterBatch("All")}
                  style={{
                    padding: "4px 14px", borderRadius: "20px", border: "1.5px solid #e5e7eb",
                    background: filterBatch === "All" ? "#374151" : "white",
                    color: filterBatch === "All" ? "white" : "#374151",
                    fontWeight: 600, fontSize: "12px", cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  All Batches
                </button>
                {ALL_BATCHES.map(batch => {
                  const { bg, text } = BATCH_COLORS[batch];
                  const isActive = filterBatch === batch;
                  const count = users.filter(u => {
                    if (u.role !== "Student") return false;
                    if (filterRole !== "All" && u.role !== filterRole) return false;
                    if (filterClass !== "All" && u.class !== filterClass) return false;
                    return (u.batch || assignBatch(u.custom_id)) === batch;
                  }).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={batch}
                      onClick={() => setFilterBatch(batch)}
                      style={{
                        padding: "4px 14px", borderRadius: "20px", cursor: "pointer",
                        border: `1.5px solid ${isActive ? text : "#e5e7eb"}`,
                        background: isActive ? bg : "white",
                        color: isActive ? text : "#374151",
                        fontWeight: isActive ? 700 : 500,
                        fontSize: "12px",
                        transition: "all 0.15s"
                      }}
                    >
                      {batch}
                      <span style={{ marginLeft: "6px", background: isActive ? text : "#e5e7eb", color: isActive ? bg : "#374151", borderRadius: "10px", padding: "1px 6px", fontSize: "11px", fontWeight: 700 }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* User Tables - Grouped by Role */}
            {filterRole === "All" ? (
              groupedRoles.map((role) => {
                const groupUsers = filtered.filter(u => u.role === role);
                if (groupUsers.length === 0) return null;
                return (
                  <div key={role} className="role-group">
                    <div className="role-group-header">
                      <span>{roleIcons[role]}</span>
                      <h4>{role}s</h4>
                      <span className={`badge ${role.toLowerCase()}`}>{groupUsers.length}</span>
                    </div>
                    <UserTable userList={groupUsers} />
                  </div>
                );
              })
            ) : (
              <UserTable userList={filtered} />
            )}
          </div>
        );
      }
      default: return <div>Coming Soon</div>;
    }
  };

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <div className="sidebar-header"><h2>⚡ Admin</h2></div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`nav-btn ${activeTab === "manage-users" ? "active" : ""}`} onClick={() => setActiveTab("manage-users")}>Manage Users</button>
          <button className={`nav-btn ${activeTab === "notices" ? "active" : ""}`} onClick={() => setActiveTab("notices")}>Notices</button>
          <button className={`nav-btn ${activeTab === "complaints" ? "active" : ""}`} onClick={() => setActiveTab("complaints")}>Complaints</button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1 style={{textTransform: 'capitalize'}}>{activeTab.replace("-", " ")}</h1>
          <div className="admin-profile"><span>System Admin (ADM001)</span></div>
        </header>

        {renderContent()}

        {/* MODAL */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h2>{isEditMode ? "Edit User" : "Add New User"}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>ID (e.g., 24DCE001)</label>
                  <input name="custom_id" value={formData.custom_id} onChange={handleChange} disabled={isEditMode} required />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="full_name" value={formData.full_name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input name="password" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" value={formData.role} onChange={handleChange}>
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Admin">Admin</option>
                    <option value="Peon">Peon</option>
                    <option value="Librarian">Librarian</option>
                  </select>
                </div>
                {formData.role === "Student" ? (
                  <>
                    <div className="form-group">
                      <label>Department</label>
                      {(() => {
                        const parsed = parseStudentId(formData.custom_id);
                        if (!parsed.hasInput) return <div style={{ padding: "12px 14px", background: "#f9fafb", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#64748b", fontSize: "14px" }}>Auto-filled from ID</div>;
                        if (parsed.reason === 'format' || parsed.reason === 'branch') return <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: 600, color: "#991b1b", fontSize: "14px" }}>⚠️ Invalid ID format</div>;
                        return <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontWeight: 600, color: "#166534", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}><span>🏛️</span> {parsed.department}</div>;
                      })()}
                    </div>
                    <div className="form-group">
                      <label>Class</label>
                      {(() => {
                        const parsed = parseStudentId(formData.custom_id);
                        if (parsed.valid) {
                          return <div style={{ padding: "12px 14px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "8px", fontWeight: 700, color: "#1d4ed8", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}><span>✅</span> {parsed.class}</div>;
                        }
                        
                        return (
                          <>
                            <div style={{ padding: "12px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", minHeight: "60px", color: "#64748b", fontSize: "14px", lineHeight: "1.5", marginBottom: parsed.reason !== 'empty' && parsed.reason !== 'branch' && parsed.reason !== 'format' ? '12px' : '0' }}>
                              Enter a valid Student ID above (e.g. 24DCE001)<br/>to auto-preview...
                            </div>
                            
                            {parsed.reason === 'future_batch' && (
                              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: 600, color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                                <span>⚠️</span>
                                <span>Cannot register 20{parsed.adminYear} batch students before June. Admissions open in June.</span>
                              </div>
                            )}
                            {parsed.reason === 'year' && (
                              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: 600, color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                                <span>⚠️</span>
                                <span>Invalid Admission Year (Too old or invalid)</span>
                              </div>
                            )}
                            {parsed.reason === 'roll' && (
                              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: 600, color: "#991b1b", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                                <span>⚠️</span>
                                <span>Invalid Roll (001-150)</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Department</label>
                    <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Administration" />
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={formData.role === "Student" && !parseStudentId(formData.custom_id).valid}
                    style={{
                      opacity: (formData.role === "Student" && !parseStudentId(formData.custom_id).valid) ? 0.5 : 1,
                      cursor: (formData.role === "Student" && !parseStudentId(formData.custom_id).valid) ? "not-allowed" : "pointer"
                    }}
                  >
                    {isEditMode ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;