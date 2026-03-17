import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Parse from "../../parseConfig";
import PieChart from "./PieChartMF";

const PAGE_SIZE = 10;

export default function Dashboard() {

  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {

    try {

      const User = Parse.Object.extend("_User");
      let allUsers = [];
      let skip = 0;
      const limit = 1000;

      while (true) {

        const query = new Parse.Query(User);
        query.limit(limit);
        query.skip(skip);
        query.descending("createdAt");

        const results = await query.find();

        if (results.length === 0) break;

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
            location
          };
        });

        allUsers = [...allUsers, ...userData];
        skip += limit;
      }

      setUsers(allUsers);
      setFiltered(allUsers);

    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {

    const value = e.target.value;
    setSearch(value);
    setPage(0);

    const filteredData = users.filter((user) =>
      user.username.toLowerCase().includes(value.toLowerCase())
    );

    setFiltered(filteredData);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedUsers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="dashboard-container">

      <h2 className="table-title">Latest Users</h2>

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

            ) : paginatedUsers.length === 0 ? (

              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                  No users found
                </td>
              </tr>

            ) : (

              paginatedUsers.map((user, index) => (

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

      {totalPages > 1 && (

        <div className="pagination">

          <button
            disabled={page === 0}
            onClick={() => changePage(page - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (

            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => changePage(i)}
            >
              {i + 1}
            </button>

          ))}

          <button
            disabled={page === totalPages - 1}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>

        </div>

      )}

    </div>
  );
}