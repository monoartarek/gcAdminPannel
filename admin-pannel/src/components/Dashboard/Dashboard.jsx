// Dashboard.jsx
import React, { useEffect, useState } from "react";
import Parse from "parse";
import "./Dashboard.css";

export default function Dashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const User = Parse.Object.extend("User"); // Your Parse class
      const query = new Parse.Query(User);
      query.limit(50); // Fetch latest 50 users
      query.descending("createdAt"); // Latest first

      try {
        const results = await query.find();
        const userData = results.map((user) => ({
          name: user.get("name") || "N/A",
          username: user.get("username") || "N/A",
          gender: user.get("gender") || "Other",
          birthday: user.get("birthday") || "31/12/1998",
          avatar: user.get("avatar") || null,
          location: user.get("location") || "Unavailable",
        }));
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="dashboard-container">
      <h2 className="table-title">Latest Users</h2>
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Avatar</th>
            <th>Gender</th>
            <th>Birthday</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                Loading users...
              </td>
            </tr>
          ) : (
            users.map((user, index) => (
              <tr key={index}>
                <td>{user.name}</td>
                <td>{user.username}</td>
                <td>
                  {user.avatar ? (
                    <img
                      src={user.avatar.url}
                      alt="avatar"
                      className="avatar-img"
                    />
                  ) : (
                    <span className="avatar-placeholder">VIEW</span>
                  )}
                </td>
                <td>{user.gender}</td>
                <td>{user.birthday}</td>
                <td>{user.location}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
