import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./FacultyDashboard.css"; // Reusing Faculty CSS for consistent look

const CounselorDashboard = () => {
  const navigate = useNavigate();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [counselorName, setCounselorName] = useState("Counselor");

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (name) setCounselorName(name);
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
        const res = await fetch("http://localhost:5000/api/leaves");
        setLeaveRequests(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleLeaveAction = async (id, status) => {
    await fetch(`http://localhost:5000/api/leaves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status })
    });
    fetchLeaves(); // Refresh list
  };

  const handleBack = () => {
    navigate("/faculty"); // Go back to Faculty Dashboard
  };

  return (
    <div className="fac-container">
      <aside className="fac-sidebar">
        <div className="logo" style={{color: "#059669"}}>🛡️ CounselorPanel</div>
        <nav>
           <button className="active">Manage Leaves</button>
           <button onClick={handleBack}>&larr; Back to Faculty</button>
        </nav>
      </aside>

      <main className="fac-main">
        <div className="welcome-banner" style={{background: "linear-gradient(135deg, #059669, #047857)"}}>
           <h2>Counselor Dashboard</h2>
           <p>Review and manage student leave applications.</p>
        </div>

        <div className="section-box">
            <h3>📝 Pending Leave Requests</h3>
            <table className="fac-table">
              <thead><tr><th>Student</th><th>Date</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {leaveRequests.map(leave => (
                  <tr key={leave._id}>
                    <td><strong>{leave.studentName || leave.studentId}</strong></td>
                    <td>{leave.date}</td>
                    <td>{leave.reason}</td>
                    <td><span className={`status ${leave.status.toLowerCase()}`}>{leave.status}</span></td>
                    <td>
                      {leave.status === "Pending" ? (
                        <div className="action-buttons">
                          <button className="approve-btn" onClick={() => handleLeaveAction(leave._id, "Approved")}>✓ Approve</button>
                          <button className="reject-btn" onClick={() => handleLeaveAction(leave._id, "Rejected")}>✗ Reject</button>
                        </div>
                      ) : (
                        <span>{leave.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && <tr><td colSpan="5">No pending requests.</td></tr>}
              </tbody>
            </table>
        </div>
      </main>
    </div>
  );
};

export default CounselorDashboard;