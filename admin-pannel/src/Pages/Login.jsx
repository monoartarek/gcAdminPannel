import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Parse from "../parseConfig";
import { saveLoginHistory } from "../utils/saveLoginHistory";
// Note: We are not using the 'Show'/'Hide' text, we're using the Eye icons for a cleaner look.
import { Eye, EyeOff } from "lucide-react"; 
import "./Login.css";

// --- PRESERVED LOGIC ---
export async function handleLogout(navigate) {
  try {
    const user = Parse.User.current();
    await saveLoginHistory(user, "logout");
    await Parse.User.logOut();
    navigate("/login");
  } catch (err) {
    console.error("Logout error:", err.message);
    await Parse.User.logOut();
    navigate("/login");
  }
}

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- PRESERVED LOGIC ---
  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);

    try {
      const user = await Parse.User.logIn(username, password);

      if (user.get("isAdmin") !== true && user.get("role") !== "admin") {
        await saveLoginHistory(user, "failed");
        await Parse.User.logOut();
        alert("You are not an admin");
        setLoading(false);
        return;
      }

      await saveLoginHistory(user, "login");
      navigate("/");
    } catch (error) {
      await saveLoginHistory(null, "failed", username);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* 3D Glassmorphic Background Shapes (Optional for depth) */}
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>

      <div className="login-card-3d">
        {/* Logo Section */}
        <div className="login-header-3d">
          <div className="logo-container-3d">
            <img src="/logo.png" alt="Company Logo" className="login-logo-3d" />
          </div>
          <div className="illustration-placeholder-3d">
            <img 
              src="https://illustrations.popsy.co/amber/designer.svg" 
              alt="Login Illustration" 
              className="illustration-3d"
            />
          </div>
        </div>

        <div className="login-body-3d">
          {/* Information Preserved */}
          <h2>Log In Now</h2>
          <p className="subtitle">Please login to continue using our app</p>

          <div className="input-group-3d">
            <input
              type="text"
              placeholder="Email or Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="neumorphic-input"
            />
          </div>

          <div className="input-group-3d password-wrapper-3d neumorphic-input">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="password-inner-input"
            />
            {/* Superb Design Update: Using Icons for Password Toggle */}
            <button 
              type="button" 
              className="toggle-password-3d"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
            </button>
          </div>

          <button 
            className={`login-submit-btn-3d ${loading ? 'loading' : ''}`} 
            onClick={handleLogin} 
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Log In"}
          </button>

          {/* Information Preserved */}
          <div className="login-footer-3d">
            <p>Only administrators can log in.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;