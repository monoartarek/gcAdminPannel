import React, { useEffect, useState, useCallback } from "react";
import "./MakeReseller.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function ResellerManagement() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch users from Parse Server
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/users?order=-createdAt&limit=1000`,
        { headers }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");

      const formatted = (data.results || []).map((u) => ({
        objectId: u.objectId,
        uid: String(u.uid || u.objectId),
        name: u.name || "N/A",
        username: u.username || "N/A",
        gender: u.gender || "N/A",
        rCoin: u.rCoin || 0,
        coins: u.coins || 0,
        role: u.role || "user",
        avatar: u.avatar?.url || "",
      }));

      setUsers(formatted);
      setFiltered(formatted);
      setPage(0);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Search by UID or username
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(0);

    if (!value.trim()) {
      setFiltered(users);
      return;
    }

    const lower = value.toLowerCase();
    const result = users.filter(
      (u) =>
        u.uid.toLowerCase().includes(lower) ||
        u.username.toLowerCase().includes(lower)
    );

    setFiltered(result);
  };

  // Increment or Decrement Coins
  const updateCoins = async (user, type) => {
    const input = prompt("Enter amount:");
    if (!input) return;

    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    const newCoins =
      type === "inc"
        ? user.coins + amount
        : Math.max(0, user.coins - amount);

    setActionLoading(user.objectId);

    try {
      const res = await fetch(
        `${SERVER_URL}/users/${user.objectId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ coins: newCoins }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      const updated = users.map((u) =>
        u.objectId === user.objectId
          ? { ...u, coins: newCoins }
          : u
      );

      setUsers(updated);
      setFiltered(updated);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Make or Remove Reseller
  const toggleReseller = async (user) => {
    const newRole =
      user.role === "reseller" ? "user" : "reseller";

    setActionLoading(user.objectId);

    try {
      const res = await fetch(
        `${SERVER_URL}/users/${user.objectId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Role update failed");

      const updated = users.map((u) =>
        u.objectId === user.objectId
          ? { ...u, role: newRole }
          : u
      );

      setUsers(updated);
      setFiltered(updated);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const handlePageChange = (index) => {
    setPage(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="reseller-page">
      <h2 className="reseller-header">Reseller & Coin Management</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Search by UID or Username..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table className="reseller-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>ObjectId</th>
              <th>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>R-Coin</th>
              <th>+ Coin</th>
              <th>- Coin</th>
              <th>Coins</th>
              <th>Gender</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="center">
                  Loading...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="11" className="center">
                  No users found.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.objectId}>
                  <td data-label="Avatar">
                    <img
                      src={user.avatar || "https://via.placeholder.com/40"}
                      alt=""
                      className="avatar"
                    />
                  </td>
                  <td data-label="ObjectId">{user.objectId}</td>
                  <td data-label="UID">{user.uid}</td>
                  <td data-label="Name">{user.name}</td>
                  <td data-label="Username">{user.username}</td>
                  <td data-label="R-Coin">{user.rCoin}</td>
                  <td data-label="+ Coin">
                    <button
                      className="coin-btn plus"
                      disabled={actionLoading === user.objectId}
                      onClick={() => updateCoins(user, "inc")}
                    >
                      {actionLoading === user.objectId ? "..." : "+"}
                    </button>
                  </td>
                  <td data-label="- Coin">
                    <button
                      className="coin-btn minus"
                      disabled={actionLoading === user.objectId}
                      onClick={() => updateCoins(user, "dec")}
                    >
                      {actionLoading === user.objectId ? "..." : "-"}
                    </button>
                  </td>
                  <td data-label="Coins">{user.coins}</td>
                  <td data-label="Gender">{user.gender}</td>
                  <td data-label="Action">
                    <button
                      className="reseller-btn"
                      disabled={actionLoading === user.objectId}
                      onClick={() => toggleReseller(user)}
                    >
                      {actionLoading === user.objectId
                        ? "..."
                        : user.role === "reseller"
                        ? "Remove"
                        : "Make Reseller"}
                    </button>
                  </td>
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
            onClick={() => handlePageChange(page - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => handlePageChange(i)}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}