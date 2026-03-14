import React, { useEffect, useState } from "react";
import "./BlockedUsers.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function BlockedUsers() {

  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {

    try {

      const res = await fetch(
        `${SERVER_URL}/users?limit=1000`,
        { headers }
      );

      const data = await res.json();

      const suspendedUsers = (data.results || []).filter(
        (u) => u.status === "suspended"
      );

      setUsers(suspendedUsers);
      setFiltered(suspendedUsers);

    } catch (err) {

      alert(err.message);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchUsers();

  }, []);

  /* SEARCH */

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

  /* PAGINATION */

  const totalPages = Math.ceil(
    filtered.length / PAGE_SIZE
  );

  const paginatedUsers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (p) => {

    setPage(p);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  };

  /* ACTIVATE USER */

  const activateUser = async (user) => {

    await fetch(
      `${SERVER_URL}/users/${user.objectId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status: "active",
        }),
      }
    );

    fetchUsers();

  };

  return (

    <div className="blockedusers-page">

      <h2 className="blockedusers-header">
        Suspended Users
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

        <table className="blockedusers-table">

          <thead>
            <tr>
              <th>UID</th>
              <th>User</th>
              <th>Username</th>
              <th>Coin</th>
              <th>Status</th>
              <th>Action</th>
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
                  No suspended users
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

                    <span className="status-badge suspended">
                      Suspended
                    </span>

                  </td>

                  <td data-label="Action">

                    <button
                      className="activate-btn"
                      onClick={() =>
                        activateUser(user)
                      }
                    >
                      Activate
                    </button>

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