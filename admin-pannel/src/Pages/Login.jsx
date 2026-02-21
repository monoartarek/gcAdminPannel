import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Parse from "../parseConfig";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const user = await Parse.User.logIn(username, password);

      if (user.get("role") !== "admin") {
        alert("You are not an admin");
        await Parse.User.logOut();
        return;
      }

      alert("Login Successful!");
      navigate("/"); // Redirect to dashboard
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h2>Admin Login</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}

export default Login;