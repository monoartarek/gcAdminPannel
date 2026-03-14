import React, { useEffect, useState } from "react";
import "./MakeAppAdmin.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function AdminUsers() {

  const [users,setUsers] = useState([]);
  const [filtered,setFiltered] = useState([]);
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(0);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    fetchUsers();
  },[]);

  const fetchUsers = async ()=>{

    try{

      const res = await fetch(
        `${SERVER_URL}/users?limit=1000`,
        {headers}
      );

      const data = await res.json();

      const results = data.results || [];

      setUsers(results);
      setFiltered(results);

    }catch(err){

      alert(err.message);

    }finally{

      setLoading(false);

    }

  };

  /* SEARCH */

  const handleSearch = (e)=>{

    const value = e.target.value.toLowerCase();

    setSearch(value);
    setPage(0);

    if(!value.trim()){
      setFiltered(users);
      return;
    }

    const results = users.filter(
      (u)=>
        String(u.uid || "")
        .toLowerCase()
        .includes(value)
        ||
        String(u.name || "")
        .toLowerCase()
        .includes(value)
    );

    setFiltered(results);

  };

  /* PAGINATION */

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedUsers = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (p)=>{
    setPage(p);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  /* ADMIN ACTION */

  const toggleAdmin = async(user)=>{

    const newStatus = user.isAdmin ? false : true;

    await fetch(
      `${SERVER_URL}/users/${user.objectId}`,
      {
        method:"PUT",
        headers,
        body:JSON.stringify({
          isAdmin:newStatus
        })
      }
    );

    fetchUsers();

  };

  return(

    <div className="adminusers-page">

      <h2 className="page-title">
        Admin Users
      </h2>

      {/* SEARCH */}

      <div className="search-box">

        <input
        type="text"
        placeholder="Search by UID or Name..."
        value={search}
        onChange={handleSearch}
        />

      </div>

      {/* TABLE */}

      <div className="table-wrapper">

        <table className="adminusers-table">

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

            {loading ? (

              <tr>
                <td colSpan="6" className="center">
                  Loading...
                </td>
              </tr>

            ) : paginatedUsers.length === 0 ? (

              <tr>
                <td colSpan="6" className="center">
                  No Users Found
                </td>
              </tr>

            ) : (

              paginatedUsers.map((user)=>(

                <tr key={user.objectId}>

                  <td data-label="ObjectId">
                    {user.objectId}
                  </td>

                  <td data-label="UID">
                    {user.uid}
                  </td>

                  <td data-label="Name">
                    {user.name}
                  </td>

                  <td data-label="Username">
                    {user.username}
                  </td>

                  <td data-label="Avatar">

                    <img
                    src={
                      user.avatar?.url ||
                      "https://via.placeholder.com/40"
                    }
                    alt=""
                    className="avatar"
                    />

                  </td>

                  <td data-label="Action">

                    <button
                    className={
                      user.isAdmin
                      ? "remove-admin-btn"
                      : "make-admin-btn"
                    }
                    onClick={()=>toggleAdmin(user)}
                    >
                      {user.isAdmin
                        ? "Remove Admin"
                        : "Make Admin"}
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
          disabled={page===0}
          onClick={()=>changePage(page-1)}
          >
          Prev
          </button>

          {Array.from({length:totalPages},(_,i)=>(

            <button
            key={i}
            className={page===i ? "active" : ""}
            onClick={()=>changePage(i)}
            >
            {i+1}
            </button>

          ))}

          <button
          disabled={page===totalPages-1}
          onClick={()=>changePage(page+1)}
          >
          Next
          </button>

        </div>

      )}

    </div>

  );

}