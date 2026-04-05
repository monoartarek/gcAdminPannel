import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Parse from "../parseConfig";
import { saveLoginHistory } from "../utils/saveLoginHistory"; // ← import
import "./Login.css";

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
        await saveLoginHistory(user, "failed"); // ← save failed (not admin)
        await Parse.User.logOut();
        alert("You are not an admin");
        setLoading(false);
        return;
      }

      /* ── Success: save history then navigate ── */
      await saveLoginHistory(user, "success"); // ← save success
      navigate("/");

    } catch (error) {
      /* ── Wrong credentials: save failed attempt ── */
      await saveLoginHistory(null, "failed", username); // ← save failed (wrong creds)
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  /* Allow Enter key to submit */
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