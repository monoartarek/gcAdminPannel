// Comments.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import "./Comments.css";
import Parse from "../../parseConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DEFAULT_PAGE_SIZE = 20;

/* ══════════════════════════════════════
   ICONS
══════════════════════════════════════ */
const Ic = {
  chat:    <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill="currentColor"/></svg>,
  search:  <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  close:   <svg width="9" height="9" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  copy:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  csv:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  excel:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 15l2-3 2 3M11 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 13h6M9 17h4M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  print:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8"/><rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  trash:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  video:   "🎬",
  prev:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  next:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
const initials = (name) => {
  if (!name || name === "N/A") return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

const avatarColors = [
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#22c55e,#06b6d4)",
];
const avatarColor = (str) => {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h += str.charCodeAt(i);
  return avatarColors[h % avatarColors.length];
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/* ══════════════════════════════════════
   EXPORT HELPERS
══════════════════════════════════════ */
const doCSV = (data) => {
  const headers = ["ObjectId", "Date", "Author", "Comment"];
  const rows = data.map((c) =>
    [`"${c.id}"`, `"${fmtDate(c.createdAt)}"`, `"${c.author}"`, `"${(c.comment || "").replace(/"/g, '""')}"`].join(",")
  );
  const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "comments_export.csv"; a.click();
};

const doExcel = (tableEl) => {
  if (!tableEl) return;
  const html = tableEl.outerHTML.replace(/ /g, "%20");
  const a = document.createElement("a");
  a.href = "data:application/vnd.ms-excel," + html;
  a.download = "comments_export.xls"; a.click();
};

const doPDF = (data) => {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Comments Report", 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exported on ${new Date().toLocaleString()} · ${data.length} records`, 14, 22);
  autoTable(doc, {
    startY: 26,
    head: [["Object ID", "Date", "Author", "Comment"]],
    body: data.map((c) => [c.id, fmtDate(c.createdAt), c.author, c.comment || ""]),
    headStyles: { fillColor: [30, 20, 10], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [50, 40, 30] },
    alternateRowStyles: { fillColor: [252, 248, 240] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 38 }, 2: { cellWidth: 30 }, 3: { cellWidth: "auto" } },
  });
  doc.save("comments_export.pdf");
};

const doCopy = (data) => {
  const cols = ["ObjectId", "Date", "Author", "Comment"];
  const rows = data.map((c) => [c.id, fmtDate(c.createdAt), c.author, c.comment || ""].join("\t"));
  const text = cols.join("\t") + "\n" + rows.join("\n");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  });
};

/* ══════════════════════════════════════
   COMPONENT
══════════════════════════════════════ */
export default function Comments() {
  const [all, setAll]         = useState([]);  // raw Parse objects
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [toast, setToast]     = useState("");
  const tableRef = useRef(null);

  /* ── Fetch all comments ── */
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const Comment = Parse.Object.extend("SteamingComments");
      let allResults = [];
      let skip = 0;
      while (true) {
        const q = new Parse.Query(Comment);
        q.limit(1000);
        q.skip(skip);
        q.descending("createdAt");
        const chunk = await q.find();
        if (chunk.length === 0) break;
        allResults = [...allResults, ...chunk];
        skip += 1000;
      }
      setAll(allResults);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);
  useEffect(() => { setPage(0); }, [search, perPage]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => c.id.toLowerCase().includes(q));
  }, [all, search]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  const startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  /* ── Page numbers ── */
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const pages = [0];
    if (safePage > 2) pages.push("…");
    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
    return pages;
  }, [totalPages, safePage]);

  /* ── Export data ── */
  const exportData = useMemo(() => filtered, [filtered]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  /* ── Delete ── */
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    try {
      const q = new Parse.Query(Parse.Object.extend("SteamingComments"));
      const obj = await q.get(id);
      await obj.destroy();
      setAll((prev) => prev.filter((c) => c.id !== id));
      showToast("✓ Comment deleted");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting comment.");
    }
  }, [showToast]);

  /* ── Render ── */
  return (
    <div className="cm-page">
      <div className="cm-inner">

        {/* ── HEADER ── */}
        <div className="cm-header">
          <div className="cm-header-left">
            <div className="cm-logo">{Ic.chat}</div>
            <div>
              <div className="cm-title">Comments</div>
              <div className="cm-sub">Streaming session comments &amp; moderation</div>
            </div>
          </div>
          <div className="cm-total-badge">
            💬 <span>{all.length} total</span>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="cm-toolbar">
          {/* Search */}
          <div className="cm-search-wrap">
            <span className="cm-search-icon">{Ic.search}</span>
            <input
              className="cm-search"
              type="text"
              placeholder="Search by Object ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cm-search-clear" onClick={() => setSearch("")} type="button">
                {Ic.close}
              </button>
            )}
          </div>

          {/* Exports */}
          <div className="cm-export-group">
            <button className="cm-exp copy"  type="button" onClick={() => { doCopy(exportData); showToast("✓ Copied to clipboard!"); }}>
              {Ic.copy} <span>Copy</span>
            </button>
            <button className="cm-exp csv"   type="button" onClick={() => doCSV(exportData)}>
              {Ic.csv} <span>CSV</span>
            </button>
            <button className="cm-exp excel" type="button" onClick={() => doExcel(tableRef.current)}>
              {Ic.excel} <span>Excel</span>
            </button>
            <button className="cm-exp pdf"   type="button" onClick={() => doPDF(exportData)}>
              {Ic.pdf} <span>PDF</span>
            </button>
            <button className="cm-exp print" type="button" onClick={() => window.print()}>
              {Ic.print} <span>Print</span>
            </button>
          </div>

          <div className="cm-results-chip">
            <strong>{filtered.length}</strong> of {all.length}
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="cm-card">

          {loading ? (
            <div className="cm-loading">
              <div className="cm-spinner" />
              Loading comments…
            </div>
          ) : filtered.length === 0 ? (
            <div className="cm-empty">
              <div className="cm-empty-icon">💬</div>
              <div className="cm-empty-title">{search ? "No results found" : "No comments yet"}</div>
              <div className="cm-empty-desc">
                {search ? `Nothing matches "${search}"` : "Comments will appear here when users engage."}
              </div>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="cm-table-scroll">
                <table className="cm-table" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Date</th>
                      <th>Video</th>
                      <th>Author</th>
                      <th>Comment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c, idx) => {
                      const author  = c.get("author") || "N/A";
                      const comment = c.get("comment") || "";
                      const video   = c.get("video")?.url?.();
                      return (
                        <tr key={c.id}>
                          <td>
                            <span className="cm-row-num">{startIdx + idx}</span>
                          </td>
                          <td>
                            <span
                              className="cm-oid"
                              title={c.id}
                              onClick={() => { navigator.clipboard?.writeText(c.id); showToast("✓ ID copied!"); }}
                            >
                              {c.id}
                            </span>
                          </td>
                          <td>
                            <span className="cm-date">{fmtDate(c.get("createdAt"))}</span>
                          </td>
                          <td>
                            {video
                              ? <video src={video} controls className="cm-video" />
                              : <div className="cm-no-video">{Ic.video}</div>
                            }
                          </td>
                          <td>
                            <div className="cm-author">
                              <div className="cm-avatar" style={{ background: avatarColor(author) }}>
                                {initials(author)}
                              </div>
                              <span className="cm-author-name">{author}</span>
                            </div>
                          </td>
                          <td>
                            <div className="cm-text">{comment}</div>
                          </td>
                          <td>
                            <button className="cm-del-btn" onClick={() => handleDelete(c.id)} type="button">
                              {Ic.trash} Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD LIST ── */}
              <div className="cm-card-list">
                {pageItems.map((c, idx) => {
                  const author  = c.get("author") || "N/A";
                  const comment = c.get("comment") || "";
                  const video   = c.get("video")?.url?.();
                  return (
                    <div key={c.id} className="cm-row-card">
                      {/* Top: author + row number */}
                      <div className="cm-row-card-top">
                        <div className="cm-author">
                          <div className="cm-avatar" style={{ background: avatarColor(author) }}>
                            {initials(author)}
                          </div>
                          <div>
                            <div className="cm-author-name">{author}</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-4)", marginTop: 1 }}>
                              #{startIdx + idx}
                            </div>
                          </div>
                        </div>
                        <button className="cm-del-btn" onClick={() => handleDelete(c.id)} type="button">
                          {Ic.trash} Delete
                        </button>
                      </div>

                      {/* Comment body */}
                      {comment && <div className="cm-row-card-body">{comment}</div>}

                      {/* Video */}
                      {video && (
                        <video src={video} controls className="cm-video"
                          style={{ width: "100%", height: "140px", marginBottom: 10, borderRadius: "var(--r-md)" }}
                        />
                      )}

                      {/* Meta grid */}
                      <div className="cm-row-card-meta">
                        <div>
                          <div className="cm-row-card-field-label">Object ID</div>
                          <span
                            className="cm-oid"
                            style={{ maxWidth: "100%", fontSize: "0.68rem" }}
                            title={c.id}
                            onClick={() => { navigator.clipboard?.writeText(c.id); showToast("✓ Copied!"); }}
                          >
                            {c.id}
                          </span>
                        </div>
                        <div>
                          <div className="cm-row-card-field-label">Date</div>
                          <div className="cm-row-card-field-value">{fmtDate(c.get("createdAt"))}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── FOOTER / PAGINATION ── */}
          {!loading && filtered.length > 0 && (
            <div className="cm-footer">
              <div className="cm-per-page">
                <span>Show</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>per page</span>
              </div>

              <div className="cm-footer-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> comments
              </div>

              <div className="cm-pages">
                <button
                  className="cm-page-btn" type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous"
                >
                  {Ic.prev}
                </button>

                {pageNums.map((p, i) =>
                  p === "…" ? (
                    <button key={`el-${i}`} className="cm-page-btn" disabled type="button">…</button>
                  ) : (
                    <button
                      key={p}
                      className={`cm-page-btn ${safePage === p ? "active" : ""}`}
                      onClick={() => setPage(p)}
                      type="button"
                    >
                      {p + 1}
                    </button>
                  )
                )}

                <button
                  className="cm-page-btn" type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next"
                >
                  {Ic.next}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── TOAST ── */}
      {toast && <div className="cm-toast">{toast}</div>}
    </div>
  );
}