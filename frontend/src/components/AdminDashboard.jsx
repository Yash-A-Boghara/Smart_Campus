import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterRole, setFilterRole] = useState("All");
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
    phone: ""
  });

  const navigate = useNavigate();

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
    setFormData({ custom_id: "", full_name: "", email: "", password: "", role: "Student", department: "", phone: "" });
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setFormData(user); 
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- FIXED: HANDLE SUBMIT BUTTON ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

        // Apply search + role filter
        const filtered = users.filter((u) => {
          const matchRole = filterRole === "All" || u.role === filterRole;
          const q = searchQuery.toLowerCase();
          const matchSearch =
            !q ||
            (u.full_name || "").toLowerCase().includes(q) ||
            (u.custom_id || "").toLowerCase().includes(q) ||
            (u.department || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q);
          return matchRole && matchSearch;
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", color: "#999", padding: "1.5rem" }}>No users found</td></tr>
                ) : (
                  userList.map((user) => (
                    <tr key={user.custom_id}>
                      <td><strong>{user.custom_id}</strong></td>
                      <td>{user.full_name}</td>
                      <td style={{ fontSize: "0.85rem", color: "#666" }}>{user.email || "—"}</td>
                      <td>{user.department || "—"}</td>
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
                    onClick={() => setFilterRole(role)}
                  >
                    <span>{roleIcons[role]}</span>
                    <span>{role}</span>
                    <span className="role-count">{count}</span>
                  </button>
                );
              })}
            </div>

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
                  <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Computer Engineering" />
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="save-btn">{isEditMode ? "Update" : "Save"}</button>
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