import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Parse from "../parseConfig";
import { saveLoginHistory } from "../utils/saveLoginHistory"; // ← import
import "./Login.css";

/* ════════════════════════════════════════════════════════
   LOGOUT HELPER — import and use this anywhere in your app
   
   Usage in any component (e.g. Navbar, Sidebar):
     import { handleLogout } from "./Login";
     <button onClick={() => handleLogout(navigate)}>Logout</button>
════════════════════════════════════════════════════════ */
export async function handleLogout(navigate) {
  try {
    const user = Parse.User.current(); // get current user before logout
    await saveLoginHistory(user, "logout"); // ← save logout event
    await Parse.User.logOut();
    navigate("/login");
  } catch (err) {
    console.error("Logout error:", err.message);
    await Parse.User.logOut(); // force logout even if history save fails
    navigate("/login");
  }
}

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);

    try {
      const user = await Parse.User.logIn(username, password);

      /* ── Not an admin: log failed attempt then reject ── */
      if (user.get("isAdmin") !== true && user.get("role") !== "admin") {
        await saveLoginHistory(user, "failed"); // ← not admin
        await Parse.User.logOut();
        alert("You are not an admin");
        setLoading(false);
        return;
      }

      /* ── Success: save login event then navigate ── */
      await saveLoginHistory(user, "login"); // ← login event
      navigate("/");

    } catch (error) {
      /* ── Wrong credentials ── */
      await saveLoginHistory(null, "failed", username); // ← failed event
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h2>Admin Login</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in…" : "Login"}
        </button>
      </div>
    </div>
  );
}

export default Login;