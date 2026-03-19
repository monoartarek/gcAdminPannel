import React, { useEffect, useState } from "react";
import "./Banner.css";
import Parse from "../../parseConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 50;

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  // ✅ FETCH DATA (FIXED)
  const fetchBanners = async () => {
    try {
      setLoading(true);

      const Banner = Parse.Object.extend("Banners");
      const query = new Parse.Query(Banner);
      query.descending("createdAt");

      const results = await query.find();

      const data = results.map((item) => {
        const img = item.get("image");

        return {
          id: item.id,
          image: img ? img.url() : null,
        };
      });

      setBanners(data);
      setFiltered(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SEARCH
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    setPage(0);

    setFiltered(
      banners.filter((b) => b.id.toLowerCase().includes(value))
    );
  };

  // ✅ UPLOAD / CREATE / EDIT (FIXED)
  const handleUpload = async () => {
    if (!file) return alert("Please select an image");

    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();

      const Banner = Parse.Object.extend("Banners");

      if (editingId) {
        // EDIT
        const query = new Parse.Query(Banner);
        const banner = await query.get(editingId);

        banner.set("image", parseFile);
        await banner.save();

        setEditingId(null);
      } else {
        // CREATE
        const banner = new Banner();
        banner.set("image", parseFile);
        await banner.save();
      }

      setFile(null);
      fetchBanners(); // refresh
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  };

  // ✅ DELETE (FIXED)
  const deleteBanner = async (id) => {
    try {
      if (!window.confirm("Delete this banner?")) return;

      const Banner = Parse.Object.extend("Banners");
      const query = new Parse.Query(Banner);
      const banner = await query.get(id);

      await banner.destroy();

      fetchBanners(); // refresh
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed");
    }
  };

  // ✅ EDIT CLICK
  const startEdit = (id) => {
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ EXPORTS
  const exportCSV = () => {
    const rows = filtered.map((b) => [b.id, b.image]);
    const csv = [["ObjectId", "Image"], ...rows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "banners.csv";
    link.click();
  };

  const exportExcel = () => {
    const table = document.getElementById("banner-table");
    const html = table.outerHTML.replace(/ /g, "%20");

    const link = document.createElement("a");
    link.href = "data:application/vnd.ms-excel," + html;
    link.download = "banners.xls";
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["ID", "Image URL"]],
      body: filtered.map((b) => [b.id, b.image]),
    });
    doc.save("banners.pdf");
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  return (
    <div className="banners-container">
      <h2 className="title">Banner Management</h2>

      {/* TOP BAR */}
      <div className="top-bar">
        <input
          type="text"
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

      {/* UPLOAD / EDIT */}
      <div className="upload-box">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button onClick={handleUpload}>
          {editingId ? "Update Banner" : "Upload Banner"}
        </button>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table id="banner-table">
          <thead>
            <tr>
              <th>ObjectId</th>
              <th>Banner Image</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3">Loading...</td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan="3">No Data Found</td>
              </tr>
            ) : (
              paginated.map((b) => (
                <tr key={b.id}>
                  <td data-label="ObjectId">{b.id}</td>

                  <td data-label="Banner Image">
                    {b.image ? (
                      <img
                        src={b.image}
                        alt="banner"
                        className="banner-img"
                      />
                    ) : (
                      "No Image"
                    )}
                  </td>

                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => startEdit(b.id)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteBanner(b.id)}
                    >
                      Delete
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