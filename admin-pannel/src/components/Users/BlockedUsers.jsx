import React, { useEffect, useState, useCallback } from "react";
import "./AllUsers.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/users?order=-createdAt&limit=1000`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const userData = (data.results || []).map((user) => ({
        objectId: user.objectId,
        uid: String(user.uid || user.objectId),
        avatar: user.avatar?.url || "",
        username: user.username || "N/A",
        coin: user.coin ?? 0,
        gender: user.gender || "N/A",
        birthday: user.birthday?.iso
          ? new Date(user.birthday.iso).toLocaleDateString()
          : "N/A",
        mode: user.mode || "N/A",
        status: user.status || "active",
      }));

      setUsers(userData);
      setFiltered(userData);
      setPage(0);
    } catch (error) {
      alert("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(0);
    if (!value.trim()) return setFiltered(users);

    const lower = value.toLowerCase();
    const results = users.filter(
      (u) =>
        u.uid.toLowerCase().includes(lower) ||
        u.username.toLowerCase().includes(lower)
    );
    setFiltered(results);
  };

  const handleSuspend = async (user) => {
    const confirm = window.confirm(
      `Change status of "${user.username}"?`
    );
    if (!confirm) return;

    setActionLoading(user.objectId);
    try {
      const newStatus =
        user.status === "suspended" ? "active" : "suspended";

      const res = await fetch(`${SERVER_URL}/users/${user.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const updated = users.map((u) =>
        u.objectId === user.objectId ? { ...u, status: newStatus } : u
      );

      setUsers(updated);
      setFiltered(updated);
      alert(`✅ User ${newStatus}`);
    } catch (error) {
      alert("❌ " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const handlePageChange = (pageIndex) => {
    setPage(pageIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="allusers-page">
      <h2 className="allusers-header">All Users</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Search by UID or Username..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table className="allusers-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>User</th>
              <th>Username</th>
              <th>Coin</th>
              <th>Gender</th>
              <th>Birthday</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="center">
                  Loading...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="9" className="center">
                  No users found.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.objectId}>
                  <td data-label="UID">{user.uid}</td>
                  <td data-label="User">
                    <img
                      src={user.avatar || "https://via.placeholder.com/40"}
                      alt="avatar"
                      className="avatar"
                    />
                  </td>
                  <td data-label="Username">{user.username}</td>
                  <td data-label="Coin">{user.coin}</td>
                  <td data-label="Gender">{user.gender}</td>
                  <td data-label="Birthday">{user.birthday}</td>
                  <td data-label="Mode">{user.mode}</td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${
                        user.status === "suspended" ? "suspended" : "active"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="actions-wrapper">
                      <button className="action-btn">View</button>
                      <button className="action-btn edit">Edit</button>
                      <button
                        className="suspend-btn"
                        onClick={() => handleSuspend(user)}
                        disabled={actionLoading === user.objectId}
                      >
                        {actionLoading === user.objectId
                          ? "..."
                          : user.status === "suspended"
                          ? "Activate"
                          : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`pagination ${isMobile ? "vertical" : ""}`}>
          <button
            className="page-btn"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={`page-num ${page === index ? "active" : ""}`}
              onClick={() => handlePageChange(index)}
            >
              {index + 1}
            </button>
          ))}

          <button
            className="page-btn"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}