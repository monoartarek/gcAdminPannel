// Dashboard.jsx
import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Parse from "../../parseConfig";

export default function Dashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const User = Parse.Object.extend("_User"); // Your Parse class
      const query = new Parse.Query(User);
      query.limit(50); // Fetch latest 50 users
      query.descending("createdAt"); // Latest first

      try {
        const results = await query.find();
        const userData = results.map((user) => ({
          name: user.get("name") || "N/A",
          username: user.get("username") || "N/A",
          gender: user.get("gender") || "Other",
          avatar: user.get("avatar").url(),
        
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
        
            <th>Gender</th>
          
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
               
                <td>{user.gender}</td>
             
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
