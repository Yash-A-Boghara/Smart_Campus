import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

// Icons
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="20" height="20">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);
const EyeIcon = ({ visible }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {visible ? (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></>) : (<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>)}
  </svg>
);

const Login = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (data.success) {
        // --- CRITICAL UPDATE: SAVE USER ID ---
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userId", userId); // Saving ID for dashboard use

        if (data.role === "Student") navigate("/student");
        else if (data.role === "Admin") navigate("/admin");
        else if (data.role === "Faculty") navigate("/faculty");
        else alert(`Dashboard for ${data.role} is coming soon.`);
        
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Cannot connect to server.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="tech-bg"></div>
        <div className="tech-overlay">
          <div className="code-snippet">
            <span>{`{`}</span><span>{`  "system": "Smart Campus",`}</span><span>{`  "status": "Online",`}</span><span>{`}`}</span>
          </div>
          <h1>Future Ready<br />Campus.</h1>
          <p>Join the next generation workflow platform.</p>
        </div>
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>

      <div className="login-right">
        <div className="login-container-right">
          <div className="logo-icon">🎓</div>
          <h2>Welcome Back</h2>
          <p className="sub-text">Please enter your Campus ID to continue.</p>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Student / Employee ID</label>
              <input type="text" placeholder="e.g. 24DCE001" value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <span className="eye-btn" onClick={() => setShowPassword(!showPassword)}><EyeIcon visible={showPassword} /></span>
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-primary">Log In</button>
            <div className="divider"><span>or</span></div>
            <button type="button" className="btn-google"><GoogleIcon /> Sign in with Google</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;