import React, { useEffect, useState, useCallback } from "react";
import "./AllManagers.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function ManagerManagement() {
  const [managers, setManagers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/users?where=${encodeURIComponent(
          JSON.stringify({ role: "manager" })
        )}&order=-createdAt&limit=1000`,
        { headers }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");

      const managerData = (data.results || []).map((user) => ({
        objectId: user.objectId,
        uid: String(user.uid || user.objectId),
        name: user.name || "N/A",
        username: user.username || "N/A",
        role: user.role || "manager",
      }));

      setManagers(managerData);
      setFiltered(managerData);
      setPage(0);
    } catch (error) {
      alert("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // 🔍 Search by UID
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(0);

    if (!value.trim()) {
      setFiltered(managers);
      return;
    }

    const lower = value.toLowerCase();
    const results = managers.filter((m) =>
      m.uid.toLowerCase().includes(lower)
    );

    setFiltered(results);
  };

  // ❌ Remove Manager
  const handleRemove = async (manager) => {
    const confirm = window.confirm(
      `Remove manager role from "${manager.username}"?`
    );
    if (!confirm) return;

    setActionLoading(manager.objectId);

    try {
      const res = await fetch(
        `${SERVER_URL}/users/${manager.objectId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ role: "user" }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const updated = managers.filter(
        (m) => m.objectId !== manager.objectId
      );

      setManagers(updated);
      setFiltered(updated);

      // If last item removed from page → go back one page
      if ((page + 1) * PAGE_SIZE > updated.length && page > 0) {
        setPage(page - 1);
      }

      alert("✅ Manager removed");
    } catch (error) {
      alert("❌ " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 📄 Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedManagers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const handlePageChange = (pageIndex) => {
    setPage(pageIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="manager-page">
      <h2 className="manager-header">Manager Management</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Search by UID..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table className="manager-table">
          <thead>
            <tr>
              <th>ObjectId</th>
              <th>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="center">Loading...</td>
              </tr>
            ) : paginatedManagers.length === 0 ? (
              <tr>
                <td colSpan="6" className="center">
                  No managers found.
                </td>
              </tr>
            ) : (
              paginatedManagers.map((manager) => (
                <tr key={manager.objectId}>
                  <td>{manager.objectId}</td>
                  <td>{manager.uid}</td>
                  <td>{manager.name}</td>
                  <td>{manager.username}</td>
                  <td>
                    <span className="role-badge">
                      {manager.role}
                    </span>
                  </td>
                  <td>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemove(manager)}
                      disabled={actionLoading === manager.objectId}
                    >
                      {actionLoading === manager.objectId
                        ? "..."
                        : "Remove"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div className="pagination">
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