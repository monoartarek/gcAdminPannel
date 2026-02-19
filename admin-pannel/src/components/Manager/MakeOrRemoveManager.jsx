import React, { useEffect, useState, useCallback } from "react";
import "./MakeOrRemoveManager.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

// আপনার চাহিদা অনুযায়ী সাইজ ৫০ সেট করা হলো
const PAGE_SIZE = 10;

export default function MakeOrRemoveManager() {
  const [allUsers, setAllUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      let allResults = [];
      let skip = 0;
      let keepFetching = true;

      while (keepFetching) {
        const res = await fetch(
          `${SERVER_URL}/users?order=-createdAt&limit=100&skip=${skip}`,
          { headers }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");

        const batch = data.results || [];
        allResults = [...allResults, ...batch];

        if (batch.length < 100) {
          keepFetching = false;
        } else {
          skip += 100;
        }
      }

      const userData = allResults.map((user) => ({
        objectId: user.objectId,
        // এখানে নিশ্চিত করা হয়েছে যে uid না থাকলে objectId ব্যবহার হবে
        uid: String(user.uid || user.objectId), 
        name: user.name || "N/A",
        username: user.username || "N/A",
        role: user.role || "user",
      }));

      setAllUsers(userData);
      setFiltered(userData);
      setPage(0);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to fetch users: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // UID দিয়ে সার্চ করার লজিক আপডেট করা হয়েছে
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(0); 
    
    if (!value.trim()) {
      setFiltered(allUsers);
      return;
    }

    const lowerSearch = value.toLowerCase();
    const searchResults = allUsers.filter((u) =>
      u.uid.toLowerCase().includes(lowerSearch) || 
      u.username.toLowerCase().includes(lowerSearch)
    );
    
    setFiltered(searchResults);
  };

  const handleAction = async (user) => {
    const isManager = user.role === "manager";
    const confirmed = window.confirm(
      isManager
        ? `Remove manager role from "${user.username}"?`
        : `Make "${user.username}" a manager?`
    );
    if (!confirmed) return;

    setActionLoading(user.objectId);
    const newRole = isManager ? "user" : "manager";

    try {
      const res = await fetch(`${SERVER_URL}/users/${user.objectId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      const updateList = (list) =>
        list.map((u) =>
          u.objectId === user.objectId ? { ...u, role: newRole } : u
        );
      setAllUsers((prev) => updateList(prev));
      setFiltered((prev) => updateList(prev));

      alert(`✅ Updated successfully!`);
    } catch (error) {
      alert("❌ Failed: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Pagination লজিক: ৫০ জন ক্রস করলেই totalPages ১ এর বেশি হবে
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handlePageChange = (pageIndex) => {
    setPage(pageIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push("...");
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 3) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="manager-container">
      <h2 className="manager-title">Make / Remove Manager</h2>

      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by UID or Username..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table className="manager-table">
          <thead>
            <tr>
              <th>UID / ObjectId</th>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>Loading...</td></tr>
            ) : paginatedUsers.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>No users found.</td></tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.objectId}>
                  <td data-label="UID">
                    <span className="mono">{user.uid}</span>
                  </td>
                  <td data-label="Name">{user.name}</td>
                  <td data-label="Username">{user.username}</td>
                  <td data-label="Role">
                    <span className={`role-badge ${user.role === "manager" ? "role-manager" : "role-user"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td data-label="Action">
                    <button
                      className={`action-btn ${user.role === "manager" ? "btn-remove" : "btn-make"}`}
                      onClick={() => handleAction(user)}
                      disabled={actionLoading === user.objectId}
                    >
                      {actionLoading === user.objectId ? "..." : user.role === "manager" ? "Remove" : "Make Manager"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Section: শুধুমাত্র ৫০ জনের বেশি ইউজার থাকলে দেখাবে */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => handlePageChange(page - 1)} disabled={page === 0}>
            Prev
          </button>
          <div className="page-numbers">
            {getPageNumbers().map((p, i) => (
              p === "..." ? <span key={i}>...</span> : 
              <button key={i} className={`page-num ${page === p ? "active" : ""}`} onClick={() => handlePageChange(p)}>
                {p + 1}
              </button>
            ))}
          </div>
          <button className="page-btn" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages - 1}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}