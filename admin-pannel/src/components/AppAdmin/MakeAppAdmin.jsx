import React, { useState, useEffect } from "react";
import "./MakeAppAdmin.css";

const APP_ID = "YOUR_APP_ID";
const REST_KEY = "YOUR_REST_API_KEY";
const SERVER_URL = "https://YOUR_PARSE_SERVER_URL/parse";

const MakeAppAdmin = () => {

  const [users, setUsers] = useState([]);
  const [searchUID, setSearchUID] = useState("");
  const [page, setPage] = useState(1);

  const limit = 20;

  // FETCH USERS
  const fetchUsers = async (pageNumber = page) => {

    try {

      let url = `${SERVER_URL}/classes/_User?limit=${limit}&skip=${(pageNumber - 1) * limit}`;

      if (searchUID) {
        url = `${SERVER_URL}/classes/_User?where={"UID":"${searchUID}"}`;
      }

      const res = await fetch(url, {
        headers: {
          "X-Parse-Application-Id": APP_ID,
          "X-Parse-REST-API-Key": REST_KEY
        }
      });

      const data = await res.json();

      setUsers(data.results || []);

    } catch (err) {
      console.error(err);
    }

  };

  // PAGE CHANGE LOAD
  useEffect(() => {

    const load = async () => {

      try {

        let url = `${SERVER_URL}/classes/_User?limit=${limit}&skip=${(page - 1) * limit}`;

        const res = await fetch(url, {
          headers: {
            "X-Parse-Application-Id": APP_ID,
            "X-Parse-REST-API-Key": REST_KEY
          }
        });

        const data = await res.json();

        setUsers(data.results || []);

      } catch (err) {
        console.error(err);
      }

    };

    load();

  }, [page]);


  // TOGGLE ADMIN
  const toggleAdmin = async (user) => {

    try {

      const newStatus = !user.isAdmin;

      const res = await fetch(`${SERVER_URL}/classes/_User/${user.objectId}`, {

        method: "PUT",

        headers: {
          "X-Parse-Application-Id": APP_ID,
          "X-Parse-REST-API-Key": REST_KEY,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          isAdmin: newStatus
        })

      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert("Failed to update admin");
      }

    } catch (err) {

      console.error(err);
      alert("Failed to update admin");

    }

  };


  return (

    <div className="adminPage">

      <h2>Make App Admin</h2>

      <div className="searchArea">

        <input
          type="text"
          placeholder="Search UID"
          value={searchUID}
          onChange={(e) => setSearchUID(e.target.value)}
        />

        <button onClick={() => fetchUsers(1)}>
          Search
        </button>

      </div>


      {/* DESKTOP TABLE */}

      <table className="adminTable">

        <thead>

          <tr>
            <th>ObjectId</th>
            <th>UID</th>
            <th>Name</th>
            <th>Username</th>
            <th>Avatar</th>
            <th>Action</th>
          </tr>

        </thead>

        <tbody>

          {users.map((user) => (

            <tr key={user.objectId}>

              <td>{user.objectId}</td>
              <td>{user.UID}</td>
              <td>{user.name}</td>
              <td>{user.username}</td>

              <td>

                {user.avatar && (
                  <img
                    src={user.avatar.url}
                    alt=""
                    className="avatar"
                  />
                )}

              </td>

              <td>

                <button
                  className={user.isAdmin ? "removeBtn" : "makeBtn"}
                  onClick={() => toggleAdmin(user)}
                >

                  {user.isAdmin ? "Remove Admin" : "Make Admin"}

                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>


      {/* MOBILE CARDS */}

      <div className="mobileCards">

        {users.map((user) => (

          <div className="card" key={user.objectId}>

            {user.avatar && (
              <img
                src={user.avatar.url}
                className="avatarBig"
                alt=""
              />
            )}

            <p><b>UID:</b> {user.UID}</p>
            <p><b>Name:</b> {user.name}</p>
            <p><b>Username:</b> {user.username}</p>

            <button
              className={user.isAdmin ? "removeBtn" : "makeBtn"}
              onClick={() => toggleAdmin(user)}
            >
              {user.isAdmin ? "Remove Admin" : "Make Admin"}
            </button>

          </div>

        ))}

      </div>


      {/* PAGINATION */}

      <div className="pagination">

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>

        <span>Page {page}</span>

        <button
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>

      </div>

    </div>

  );

};

export default MakeAppAdmin;