import React, { useEffect, useState } from "react";
import "./AllAgencyHistory.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function BoardEarnings() {

  const [data,setData] = useState([]);
  const [filtered,setFiltered] = useState([]);
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(0);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    fetchData();
  },[]);

  const fetchData = async () => {

    try{

      const res = await fetch(
        `${SERVER_URL}/classes/BoardEarnings?limit=1000`,
        {headers}
      );

      const json = await res.json();

      const results = json.results || [];

      setData(results);
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
      setFiltered(data);
      return;
    }

    const results = data.filter(
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

  const paginated = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (p)=>{
    setPage(p);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  /* EXPORT */

  const tableCSV = ()=>{

    const rows = [

      [
        "ObjectId",
        "UID",
        "Name",
        "Username",
        "Agency Name",
        "Agency Owner ID",
        "Board Type",
        "Earning",
        "Duration",
        "Bonus",
        "Withdraw Amount",
        "Withdraw Type"
      ],

      ...filtered.map((u)=>[
        u.objectId,
        u.uid,
        u.name,
        u.username,
        u.agencyName,
        u.agencyOwnerId,
        u.boardType,
        u.earning,
        u.duration,
        u.bonus,
        u.withdrawAmount,
        u.withdrawType
      ])

    ];

    return rows.map(e=>e.join(",")).join("\n");

  };

  const downloadCSV = ()=>{

    const blob = new Blob([tableCSV()],{type:"text/csv"});

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "board_earnings.csv";
    a.click();

  };

  const downloadExcel = ()=>{

    const blob = new Blob([tableCSV()],{type:"application/vnd.ms-excel"});

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "board_earnings.xls";
    a.click();

  };

  const copyTable = ()=>{
    navigator.clipboard.writeText(tableCSV());
    alert("Copied");
  };

  const printTable = ()=>{
    window.print();
  };

  const pdfDownload = ()=>{
    window.print();
  };

  return(

    <div className="boardearnings-page">

      <h2 className="page-title">Board Earnings</h2>

      <div className="top-bar">

        <input
        type="text"
        placeholder="Search by UID or Name..."
        value={search}
        onChange={handleSearch}
        />

        <div className="export-buttons">

          <button onClick={copyTable}>Copy</button>
          <button onClick={downloadCSV}>CSV</button>
          <button onClick={downloadExcel}>Excel</button>
          <button onClick={pdfDownload}>PDF</button>
          <button onClick={printTable}>Print</button>

        </div>

      </div>

      <div className="table-wrapper">

        <table className="boardearnings-table">

          <thead>

            <tr>

              <th>ObjectId</th>
              <th>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Agency Name</th>
              <th>Agency Owner ID</th>
              <th>Board Type</th>
              <th>Earning</th>
              <th>Duration</th>
              <th>Bonus</th>
              <th>Withdraw Amount</th>
              <th>Withdraw Type</th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td colSpan="12" className="center">
                  Loading...
                </td>
              </tr>

            ) : paginated.length === 0 ? (

              <tr>
                <td colSpan="12" className="center">
                  No Data
                </td>
              </tr>

            ) : (

              paginated.map((u)=>(

                <tr key={u.objectId}>

                  <td data-label="ObjectId">{u.objectId}</td>
                  <td data-label="UID">{u.uid}</td>
                  <td data-label="Name">{u.name}</td>
                  <td data-label="Username">{u.username}</td>
                  <td data-label="Agency Name">{u.agencyName}</td>
                  <td data-label="Agency Owner ID">{u.agencyOwnerId}</td>
                  <td data-label="Board Type">{u.boardType}</td>
                  <td data-label="Earning">{u.earning}</td>
                  <td data-label="Duration">{u.duration}</td>
                  <td data-label="Bonus">{u.bonus}</td>
                  <td data-label="Withdraw Amount">{u.withdrawAmount}</td>
                  <td data-label="Withdraw Type">{u.withdrawType}</td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

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