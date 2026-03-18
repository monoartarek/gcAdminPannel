// Posts.jsx
import React, { useEffect, useState } from "react";
import "./Posts.css";
import Parse from "../../parseConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 50;

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const Post = Parse.Object.extend("Posts");
      let allPosts = [];
      let skip = 0;
      const limit = 1000;

      while (true) {
        const query = new Parse.Query(Post);
        query.limit(limit);
        query.skip(skip);
        query.descending("createdAt");

        const results = await query.find();
        if (results.length === 0) break;

        const postData = results.map((post) => ({
          id: post.id,
          date: new Date(post.createdAt).toLocaleString(),
          author: post.get("author") || "N/A",
          description: post.get("description") || "",
          picture: post.get("picture")?.url?.(),
          video: post.get("video")?.url?.(),
          likes: post.get("likes") || 0,
          comments: post.get("comments") || 0,
        }));

        allPosts = [...allPosts, ...postData];
        skip += limit;
      }

      setPosts(allPosts);
      setFiltered(allPosts);
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

    const filteredData = posts.filter((p) =>
      p.id.toLowerCase().includes(value.toLowerCase())
    );

    setFiltered(filteredData);
  };

  const deletePost = async (id) => {
    if (!window.confirm("Delete this post?")) return;

    const Post = Parse.Object.extend("Posts");
    const query = new Parse.Query(Post);
    const obj = await query.get(id);
    await obj.destroy();

    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    setFiltered(updated);
  };

  const exportCSV = () => {
    const headers = ["ObjectId", "Date", "Author", "Description", "Likes", "Comments"];
    const rows = filtered.map((p) => [p.id, p.date, p.author, p.description, p.likes, p.comments]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "posts.csv";
    a.click();
  };

  const exportExcel = () => {
    const table = document.querySelector("table");
    const html = table.outerHTML.replace(/ /g, "%20");
    const a = document.createElement("a");
    a.href = "data:application/vnd.ms-excel," + html;
    a.download = "posts.xls";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["ID", "Date", "Author", "Description", "Likes", "Comments"]],
      body: filtered.map((p) => [p.id, p.date, p.author, p.description, p.likes, p.comments]),
    });
    doc.save("posts.pdf");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="posts-container">
      <h2 className="title">Posts Management</h2>

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
              <th>Author</th>
              <th>Description</th>
              <th>Picture</th>
              <th>Video</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="9">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan="9">No posts</td></tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id}>
                  <td data-label="ID">{p.id}</td>
                  <td data-label="Date">{p.date}</td>
                  <td data-label="Author">{p.author}</td>
                  <td data-label="Description">{p.description}</td>
                  <td data-label="Picture">{p.picture && <img src={p.picture} className="media" />}</td>
                  <td data-label="Video">{p.video && <video src={p.video} controls className="media" />}</td>
                  <td>{p.likes}</td>
                  <td>{p.comments}</td>
                  <td><button className="delete-btn" onClick={() => deletePost(p.id)}>Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={page === i ? "active" : ""} onClick={() => setPage(i)}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


