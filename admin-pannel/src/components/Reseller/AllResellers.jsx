import React, { useEffect, useState, useCallback } from "react";
import "./AllResellers.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function AllResellers() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch all users and filter only resellers
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/users?order=-createdAt&limit=1000`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");

      // filter only resellers
      const formatted = (data.results || [])
        .filter((u) => u.role === "reseller")
        .map((u) => ({
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

  // 🔍 Search by UID
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
      (u) => u.uid.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower)
    );

    setFiltered(result);
  };

  // 💰 Increment / Decrement Coins
  const updateCoins = async (user, type) => {
    const input = prompt("Enter amount:");
    if (!input) return;

    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    const newCoins = type === "inc" ? user.coins + amount : Math.max(0, user.coins - amount);

    setActionLoading(user.objectId);

    try {
      const res = await fetch(`${SERVER_URL}/users/${user.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ coins: newCoins }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      const updated = users.map((u) =>
        u.objectId === user.objectId ? { ...u, coins: newCoins } : u
      );
      setUsers(updated);
      setFiltered(updated);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 🔄 Remove Reseller (change role back to user)
  const removeReseller = async (user) => {
    const confirmed = window.confirm(`Remove "${user.username}" as reseller?`);
    if (!confirmed) return;

    setActionLoading(user.objectId);
    try {
      const res = await fetch(`${SERVER_URL}/users/${user.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ role: "user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      const updated = users.filter((u) => u.objectId !== user.objectId);
      setUsers(updated);
      setFiltered(updated);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 📄 Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handlePageChange = (index) => {
    setPage(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="reseller-page">
      <h2 className="reseller-header">All Resellers</h2>

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
              <th>ObjectId</th>
              <th>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Avatar</th>
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
                  No resellers found.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.objectId}>
                  <td>{user.objectId}</td>
                  <td>{user.uid}</td>
                  <td>{user.name}</td>
                  <td>{user.username}</td>
                  <td>
                    <img
                      src={user.avatar || "https://via.placeholder.com/40"}
                      alt=""
                      className="avatar"
                    />
                  </td>
                  <td>{user.rCoin}</td>
                  <td>
                    <button
                      className="coin-btn plus"
                      disabled={actionLoading === user.objectId}
                      onClick={() => updateCoins(user, "inc")}
                    >
                      +
                    </button>
                  </td>
                  <td>
                    <button
                      className="coin-btn minus"
                      disabled={actionLoading === user.objectId}
                      onClick={() => updateCoins(user, "dec")}
                    >
                      -
                    </button>
                  </td>
                  <td>{user.coins}</td>
                  <td>{user.gender}</td>
                  <td>
                    <button
                      className="reseller-btn"
                      disabled={actionLoading === user.objectId}
                      onClick={() => removeReseller(user)}
                    >
                      {actionLoading === user.objectId ? "..." : "Remove"}
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
          <button disabled={page === 0} onClick={() => handlePageChange(page - 1)}>
            Prev
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} className={page === i ? "active" : ""} onClick={() => handlePageChange(i)}>
              {i + 1}
            </button>
          ))}
          <button disabled={page === totalPages - 1} onClick={() => handlePageChange(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}