// Comments.jsx
import React, { useEffect, useState } from "react";
import "./Comments.css";
import Parse from "../../parseConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 50;

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const Comment = Parse.Object.extend("Comments");
      let all = [];
      let skip = 0;
      const limit = 1000;

      while (true) {
        const query = new Parse.Query(Comment);
        query.limit(limit);
        query.skip(skip);
        query.descending("createdAt");

        const results = await query.find();
        if (results.length === 0) break;

        const data = results.map((c) => ({
          id: c.id,
          date: new Date(c.createdAt).toLocaleString(),
          video: c.get("video")?.url?.(),
          author: c.get("author") || "N/A",
          comment: c.get("comment") || "",
        }));

        all = [...all, ...data];
        skip += limit;
      }

      setComments(all);
      setFiltered(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(0);

    const filteredData = comments.filter((c) =>
      c.id.toLowerCase().includes(value.toLowerCase())
    );

    setFiltered(filteredData);
  };

  const deleteComment = async (id) => {
    if (!window.confirm("Delete this comment?")) return;

    const Comment = Parse.Object.extend("Comments");
    const query = new Parse.Query(Comment);
    const obj = await query.get(id);
    await obj.destroy();

    const updated = comments.filter((c) => c.id !== id);
    setComments(updated);
    setFiltered(updated);
  };

  // EXPORTS
  const exportCSV = () => {
    const headers = ["ObjectId", "Date", "Author", "Comment"];
    const rows = filtered.map((c) => [c.id, c.date, c.author, c.comment]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comments.csv";
    a.click();
  };

  const exportExcel = () => {
    const table = document.querySelector("table");
    const html = table.outerHTML.replace(/ /g, "%20");
    const a = document.createElement("a");
    a.href = "data:application/vnd.ms-excel," + html;
    a.download = "comments.xls";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["ID", "Date", "Author", "Comment"]],
      body: filtered.map((c) => [c.id, c.date, c.author, c.comment]),
    });
    doc.save("comments.pdf");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="comments-container">
      <h2 className="title">Comments</h2>

      <div className="top-bar">
        <input
          placeholder="🔍 Search by ObjectId..."
          value={search}
          onChange={handleSearch}
        />

        <div className="actions">
          <button onClick={exportCSV}>CSV</button>
          <button onClick={exportExcel}>Excel</button>
          <button onClick={exportPDF}>PDF</button>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Video</th>
              <th>Author</th>
              <th>Comment</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="6">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan="6">No comments</td></tr>
            ) : (
              paginated.map((c) => (
                <tr key={c.id}>
                  <td data-label="ID">{c.id}</td>
                  <td data-label="Date">{c.date}</td>
                  <td data-label="Video">
                    {c.video && (
                      <video src={c.video} controls className="media" />
                    )}
                  </td>
                  <td data-label="Author">{c.author}</td>
                  <td data-label="Comment">{c.comment}</td>
                  <td>
                    <button className="delete-btn" onClick={() => deleteComment(c.id)}>
                      Delete
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
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


