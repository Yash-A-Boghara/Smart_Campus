import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

// --- AUTO-ASSIGN CLASS FROM ENROLLMENT ID (mirrors backend logic) ---
function assignClass(enrollmentId) {
  if (!enrollmentId) return null;
  const match = enrollmentId.match(/^(\d{2})D([A-Z]{2,3})(\d{3})$/);
  if (!match) return null;
  const admissionYear = parseInt(match[1], 10); // e.g. 24
  const branch = match[2];                       // e.g. CE
  const roll = parseInt(match[3], 10);           // e.g. 001 => 1
  const supported = ['CE', 'CS', 'IT', 'ME', 'EC'];
  if (!supported.includes(branch)) return null;
  // Dynamic prefix: June starts new academic year (odd sem), before June = even sem
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const isNewAcademicYear = now.getMonth() >= 5; // June = index 5
  const yearDiff = currentYear - admissionYear;
  const semesterPrefix = yearDiff * 2 + (isNewAcademicYear ? 1 : 0);
  if (semesterPrefix <= 0) return null;
  if (roll >= 1  && roll <= 74)  return `${semesterPrefix}${branch}1`;
  if (roll >= 75 && roll <= 150) return `${semesterPrefix}${branch}2`;
  return null;
}

// --- AUTO-ASSIGN DEPARTMENT FROM BRANCH CODE ---
function assignDepartment(enrollmentId) {
  if (!enrollmentId) return null;
  const match = enrollmentId.match(/^\d{2}D([A-Z]{2,3})\d{3}$/);
  if (!match) return null;
  const map = {
    CE: 'Computer Engineering',
    CS: 'Computer Science',
    IT: 'Information Technology',
    ME: 'Mechanical Engineering',
    EC: 'Electronics & Communication',
  };
  return map[match[1]] || null;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterRole, setFilterRole] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form Data State
  const [formData, setFormData] = useState({
    custom_id: "",
    full_name: "",
    email: "",
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
    setFormData({ custom_id: "", full_name: "", email: "", password: "", role: "Student", department: "", phone: "", class: "" });
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

        // Apply search + role + class filter
        const filtered = users.filter((u) => {
          const matchRole = filterRole === "All" || u.role === filterRole;
          const matchClass = filterClass === "All" || u.class === filterClass;
          const q = searchQuery.toLowerCase();
          const matchSearch =
            !q ||
            (u.full_name || "").toLowerCase().includes(q) ||
            (u.custom_id || "").toLowerCase().includes(q) ||
            (u.department || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q);
          return matchRole && matchSearch && matchClass;
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
                  <th>Email</th>
                  <th>Department</th>
                  <th>Class</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", color: "#999", padding: "1.5rem" }}>No users found</td></tr>
                ) : (
                  userList.map((user) => (
                    <tr key={user.custom_id}>
                      <td><strong>{user.custom_id}</strong></td>
                      <td>{user.full_name}</td>
                      <td style={{ fontSize: "0.85rem", color: "#666" }}>{user.email || "—"}</td>
                      <td>{user.department || "—"}</td>
                      <td>
                        {user.class ? (
                          <span style={{ background: getClassColor(user.class).bg, color: getClassColor(user.class).text, padding: "2px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>{user.class}</span>
                        ) : "—"}
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
                    onClick={() => { setFilterRole(role); setFilterClass("All"); }}
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
                  <label>Email</label>
                  <input name="email" value={formData.email} onChange={handleChange} required />
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
                <div className="form-group">
                  <label>Department</label>
                  {deptPreview ? (
                    <div style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#f0fdf4", color: "#15803d", fontWeight: 600, fontSize: "14px" }}>
                      🏛️ {deptPreview}
                    </div>
                  ) : (
                    <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Computer Engineering" />
                  )}
                </div>
                {/* Auto-Assigned Class (read-only) — only for Students */}
                {formData.role === "Student" && (
                  <div className="form-group">
                    <label>Class</label>
                    <div style={{
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      background: classPreview ? "#eff6ff" : "#f9fafb",
                      color: classPreview ? "#1d4ed8" : "#9ca3af",
                      fontWeight: classPreview ? 600 : 400,
                      fontSize: "14px"
                    }}>
                      {classPreview
                        ? `🏫 ${classPreview}`
                        : "Enter a valid Student ID above (e.g. 24DCE001) to auto-preview..."}
                    </div>
                  </div>
                )}

                {/* Early Admission Guard Warning */}
                {earlyAdmissionError && (
                  <div style={{
                    margin: "8px 0", padding: "10px 14px", borderRadius: "8px",
                    background: "#fef2f2", border: "1px solid #fca5a5",
                    color: "#b91c1c", fontWeight: 600, fontSize: "13px"
                  }}>
                    {earlyAdmissionError}
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="save-btn" disabled={!!earlyAdmissionError} style={{ opacity: earlyAdmissionError ? 0.4 : 1, cursor: earlyAdmissionError ? "not-allowed" : "pointer" }}>
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