import React, { useEffect, useState } from "react";
import "./AllAdmins.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function Admins() {

  const [admins,setAdmins] = useState([]);
  const [filtered,setFiltered] = useState([]);
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(0);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    fetchAdmins();
  },[]);

  const fetchAdmins = async ()=>{

    try{

      const res = await fetch(
        `${SERVER_URL}/users?where={"isAdmin":true}&limit=1000`,
        {headers}
      );

      const data = await res.json();

      const results = data.results || [];

      setAdmins(results);
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
      setFiltered(admins);
      return;
    }

    const results = admins.filter(
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

  const paginatedAdmins = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (p)=>{
    setPage(p);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  /* REMOVE ADMIN */

  const removeAdmin = async(user)=>{

    const confirm = window.confirm(
      `Remove admin access from "${user.username}"?`
    );

    if(!confirm) return;

    try{

      await fetch(
        `${SERVER_URL}/users/${user.objectId}`,
        {
          method:"PUT",
          headers,
          body:JSON.stringify({
            isAdmin:false
          })
        }
      );

      fetchAdmins();

    }catch(err){

      alert(err.message);

    }

  };

  return(

    <div className="admins-page">

      <h2 className="page-title">
        Admin List
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

        <table className="admins-table">

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

            ) : paginatedAdmins.length === 0 ? (

              <tr>
                <td colSpan="6" className="center">
                  No Admins Found
                </td>
              </tr>

            ) : (

              paginatedAdmins.map((user)=>(

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
                    className="remove-admin-btn"
                    onClick={()=>removeAdmin(user)}
                    >
                      Remove Admin
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