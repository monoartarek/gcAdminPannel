// Dashboard.jsx
import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Parse from "../../parseConfig";
import PieChart from "./PieChartMF";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const User = Parse.Object.extend("_User");
      const query = new Parse.Query(User);
      query.limit(50);
      query.descending("createdAt");

      try {
        const results = await query.find();

        const userData = results.map((user) => {
          const avatarRaw = user.get("avatar");
          let avatarUrl = null;

          if (avatarRaw && typeof avatarRaw.url === "function") {
            avatarUrl = avatarRaw.url();
          } else if (typeof avatarRaw === "string") {
            avatarUrl = avatarRaw;
          }

          const birthdayRaw = user.get("birthday");
          let birthday = "N/A";
          if (birthdayRaw) {
            birthday = new Date(birthdayRaw).toLocaleDateString("en-GB");
          }

          const locationRaw = user.get("location");
          let location = "N/A";
          if (locationRaw) {
            if (typeof locationRaw === "string") {
              location = locationRaw;
            } else if (locationRaw.latitude && locationRaw.longitude) {
              location = `${locationRaw.latitude.toFixed(4)}, ${locationRaw.longitude.toFixed(4)}`;
            }
          }

          return {
            name: user.get("name") || "N/A",
            username: user.get("username") || "N/A",
            avatar: avatarUrl,
            gender: user.get("gender") || "N/A",
            birthday,
            location,
          };
        });

        setUsers(userData);
        setFiltered(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    const filteredData = users.filter((user) =>
      user.username.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(filteredData);
  };

  return (
    <div className="dashboard-container">

      <h2 className="table-title">Latest Users</h2>
      {/* GenderPieChart */}
      <PieChart />  
      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by username..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Username</th>
              <th>Gender</th>
              <th>Birthday</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                  Loading users...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                  {search ? `No users found for "${search}"` : "No users found."}
                </td>
              </tr>
            ) : (
              filtered.map((user, index) => (
                <tr key={index}>
                  <td data-label="Avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt="avatar" className="avatar-img" />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </td>
                  <td data-label="Name">{user.name}</td>
                  <td data-label="Username">{user.username}</td>
                  <td data-label="Gender">{user.gender}</td>
                  <td data-label="Birthday">{user.birthday}</td>
                  <td data-label="Location">{user.location}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}