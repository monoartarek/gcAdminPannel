import React, { useEffect, useState } from "react";
import "./AllEarnings.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function AllEarnings() {
  const [earnings, setEarnings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const res = await fetch(
        `${SERVER_URL}/classes/Earnings?limit=1000`,
        { headers }
      );

      const data = await res.json();

      const results = data.results || [];

      setEarnings(results);
      setFiltered(results);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* SEARCH */

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    setPage(0);

    if (!value.trim()) {
      setFiltered(earnings);
      return;
    }

    const results = earnings.filter(
      (u) =>
        String(u.hostUid || "")
          .toLowerCase()
          .includes(value) ||
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

  const changePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* EXPORT FUNCTIONS */

  const tableToCSV = () => {
    const rows = [
      [
        "ObjectId",
        "Host UID",
        "Name",
        "Agency Name",
        "Agency Owner ID",
        "Video board Earning",
        "Video board Duration",
        "Audio board Earning",
        "Audio board Duration",
        "Total board Earning",
        "Total User Earning",
      ],
      ...filtered.map((u) => [
        u.objectId,
        u.hostUid,
        u.name,
        u.agencyName,
        u.agencyOwnerId,
        u.videoBoardEarning,
        u.videoBoardDuration,
        u.audioBoardEarning,
        u.audioBoardDuration,
        u.totalBoardEarning,
        u.totalUserEarning,
      ]),
    ];

    return rows.map((e) => e.join(",")).join("\n");
  };

  const downloadCSV = () => {
    const blob = new Blob([tableToCSV()], {
      type: "text/csv",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "earnings.csv";
    a.click();
  };

  const downloadExcel = () => {
    const blob = new Blob([tableToCSV()], {
      type: "application/vnd.ms-excel",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "earnings.xls";
    a.click();
  };

  const copyTable = () => {
    navigator.clipboard.writeText(tableToCSV());
    alert("Copied to clipboard");
  };

  const printTable = () => {
    window.print();
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <div className="earnings-page">
      <h2 className="page-title">All Earnings</h2>

      {/* SEARCH */}

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
          <button onClick={downloadPDF}>PDF</button>
          <button onClick={printTable}>Print</button>
        </div>
      </div>

      {/* TABLE */}

      <div className="table-wrapper">
        <table className="earnings-table">
          <thead>
            <tr>
              <th>ObjectId</th>
              <th>Host UID</th>
              <th>Name</th>
              <th>Agency Name</th>
              <th>Agency Owner ID</th>
              <th>Video Earning</th>
              <th>Video Duration</th>
              <th>Audio Earning</th>
              <th>Audio Duration</th>
              <th>Total Board</th>
              <th>Total User</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="center">
                  Loading...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan="11" className="center">
                  No Data
                </td>
              </tr>
            ) : (
              paginated.map((u) => (
                <tr key={u.objectId}>
                  <td data-label="ObjectId">{u.objectId}</td>
                  <td data-label="Host UID">{u.hostUid}</td>
                  <td data-label="Name">{u.name}</td>
                  <td data-label="Agency Name">{u.agencyName}</td>
                  <td data-label="Agency Owner ID">{u.agencyOwnerId}</td>
                  <td data-label="Video">{u.videoBoardEarning}</td>
                  <td data-label="Video Duration">{u.videoBoardDuration}</td>
                  <td data-label="Audio">{u.audioBoardEarning}</td>
                  <td data-label="Audio Duration">{u.audioBoardDuration}</td>
                  <td data-label="Total Board">{u.totalBoardEarning}</td>
                  <td data-label="Total User">{u.totalUserEarning}</td>
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
            disabled={page === 0}
            onClick={() => changePage(page - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => changePage(i)}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages - 1}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}