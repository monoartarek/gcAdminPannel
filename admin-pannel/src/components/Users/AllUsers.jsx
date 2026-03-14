import React, { useEffect, useState } from "react";
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

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/users?limit=1000`, { headers });
      const data = await res.json();

      setUsers(data.results || []);
      setFiltered(data.results || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= SEARCH ================= */

  const handleSearch = (e) => {

    const value = e.target.value;
    setSearch(value);
    setPage(0);

    if (!value.trim()) {
      setFiltered(users);
      return;
    }

    const lower = value.toLowerCase();

    const results = users.filter(
      (u) =>
        String(u.uid || "")
          .toLowerCase()
          .includes(lower) ||
        (u.username || "")
          .toLowerCase()
          .includes(lower)
    );

    setFiltered(results);
  };

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedUsers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= SUSPEND ================= */

  const toggleSuspend = async (user) => {

    const newStatus =
      user.status === "suspended"
        ? "active"
        : "suspended";

    await fetch(`${SERVER_URL}/users/${user.objectId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: newStatus }),
    });

    fetchUsers();
  };

  /* ================= EDIT ================= */

  const handleEditChange = (e) => {

    setEditUser({
      ...editUser,
      [e.target.name]: e.target.value,
    });
  };

  const updateUser = async () => {

    await fetch(`${SERVER_URL}/users/${editUser.objectId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        username: editUser.username,
        coin: Number(editUser.coin),
        gender: editUser.gender,
        mode: editUser.mode,
      }),
    });

    alert("User Updated");

    setEditUser(null);

    fetchUsers();
  };

  /* ================= PROFILE PAGE ================= */

  if (viewUser) {

    return (
      <div className="profile-container">

        <button
          className="back-btn"
          onClick={() => setViewUser(null)}
        >
          ← Back
        </button>

        <div className="profile-card">

          <img
            src={
              viewUser.avatar?.url ||
              "https://via.placeholder.com/120"
            }
            alt=""
          />

          <h2>{viewUser.username}</h2>

          <p><b>UID:</b> {viewUser.uid}</p>
          <p><b>Coin:</b> {viewUser.coin}</p>
          <p><b>Gender:</b> {viewUser.gender}</p>
          <p><b>Status:</b> {viewUser.status}</p>
          <p><b>Mode:</b> {viewUser.mode}</p>
          <p><b>Email:</b> {viewUser.email}</p>
          <p><b>Birthday:</b> {viewUser.birthday?.iso}</p>
          <p><b>Created:</b> {viewUser.createdAt}</p>

        </div>

      </div>
    );
  }

  /* ================= EDIT PAGE ================= */

  if (editUser) {

    return (
      <div className="edit-container">

        <button
          className="back-btn"
          onClick={() => setEditUser(null)}
        >
          ← Back
        </button>

        <h2>Edit User</h2>

        <input
          name="username"
          value={editUser.username || ""}
          onChange={handleEditChange}
          placeholder="Username"
        />

        <input
          name="coin"
          value={editUser.coin || ""}
          onChange={handleEditChange}
          placeholder="Coin"
        />

        <input
          name="gender"
          value={editUser.gender || ""}
          onChange={handleEditChange}
          placeholder="Gender"
        />

        <input
          name="mode"
          value={editUser.mode || ""}
          onChange={handleEditChange}
          placeholder="Mode"
        />

        <button
          className="update-btn"
          onClick={updateUser}
        >
          Update User
        </button>

      </div>
    );
  }

  /* ================= USERS TABLE ================= */

  return (
    <div className="allusers-page">

      <h2 className="allusers-header">
        All Users
      </h2>

      {/* SEARCH */}

      <div className="search-box">

        <input
          type="text"
          placeholder="🔍 Search by UID or Username..."
          value={search}
          onChange={handleSearch}
        />

      </div>

      {/* TABLE */}

      <div className="table-wrapper">

        <table className="allusers-table">

          <thead>
            <tr>
              <th>UID</th>
              <th>User</th>
              <th>Username</th>
              <th>Coin</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td colSpan="6" className="center">
                  Loading...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="center">
                  No users found
                </td>
              </tr>
            ) : (

              paginatedUsers.map((user) => (

                <tr key={user.objectId}>

                  <td data-label="UID">
                    {user.uid}
                  </td>

                  <td data-label="User">

                    <img
                      src={
                        user.avatar?.url ||
                        "https://via.placeholder.com/40"
                      }
                      className="avatar"
                      alt=""
                    />

                  </td>

                  <td data-label="Username">
                    {user.username}
                  </td>

                  <td data-label="Coin">
                    {user.coin}
                  </td>

                  <td data-label="Status">

                    <span
                      className={
                        user.status === "suspended"
                          ? "status-badge suspended"
                          : "status-badge active"
                      }
                    >
                      {user.status || "active"}
                    </span>

                  </td>

                  <td data-label="Actions">

                    <div className="actions-wrapper">

                      <button
                        className="action-btn"
                        onClick={() =>
                          setViewUser(user)
                        }
                      >
                        View
                      </button>

                      <button
                        className="action-btn edit"
                        onClick={() =>
                          setEditUser(user)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="suspend-btn"
                        onClick={() =>
                          toggleSuspend(user)
                        }
                      >
                        {user.status === "suspended"
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

      {/* PAGINATION */}

      {totalPages > 1 && (

        <div className="pagination">

          <button
            className="page-btn"
            disabled={page === 0}
            onClick={() =>
              changePage(page - 1)
            }
          >
            Prev
          </button>

          {Array.from(
            { length: totalPages },
            (_, i) => (
              <button
                key={i}
                className={
                  page === i
                    ? "page-num active"
                    : "page-num"
                }
                onClick={() =>
                  changePage(i)
                }
              >
                {i + 1}
              </button>
            )
          )}

          <button
            className="page-btn"
            disabled={
              page === totalPages - 1
            }
            onClick={() =>
              changePage(page + 1)
            }
          >
            Next
          </button>

        </div>

      )}

    </div>
  );
}