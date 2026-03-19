import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Parse from "../../parseConfig";
import "./Streaming.css";

/* ══════════════════════════════════════════
   SVG ICONS
══════════════════════════════════════════ */
const Icons = {
  stream:  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A1 1 0 0 0 8 6.82z" fill="currentColor"/></svg>,
  search:  <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  close:   <svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  copy:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.24L16.76 4H10a2 2 0 0 0-2 0zM6 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  excel:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 13l2 3 2-3M11 13v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  csv:     <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  prev:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  next:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  male:    "♂",
  female:  "♀",
  views:   <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>,
};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const fmtDate = (d) =>
  d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const fmtViews = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
};

const initials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};

const avatarColor = (str) => {
  const colors = [
    "linear-gradient(135deg,#3b82f6,#6366f1)",
    "linear-gradient(135deg,#8b5cf6,#ec4899)",
    "linear-gradient(135deg,#06b6d4,#3b82f6)",
    "linear-gradient(135deg,#f97316,#ef4444)",
    "linear-gradient(135deg,#22c55e,#06b6d4)",
    "linear-gradient(135deg,#f59e0b,#f97316)",
  ];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash += str.charCodeAt(i);
  return colors[hash % colors.length];
};

/* ══════════════════════════════════════════
   EXPORT UTILITIES
══════════════════════════════════════════ */
const rowToExportObj = (item) => ({
  ObjectId:  item.id,
  HostUID:   item.get("hostUID") || item.get("userId") || item.get("uid") || "—",
  Date:      fmtDate(item.get("createdAt")),
  Streamer:  item.get("streamerName") || item.get("name") || item.get("username") || "—",
  Gender:    item.get("gender") || "—",
  Views:     item.get("views") || item.get("viewCount") || 0,
  Status:    item.get("isLive") ?? item.get("status") ?? false ? "Live" : "Offline",
});

const exportCSV = (data) => {
  const cols = ["ObjectId","HostUID","Date","Streamer","Gender","Views","Status"];
  const rows = data.map((r) => cols.map((c) => `"${r[c]}"`).join(","));
  const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "streaming_export.csv"; a.click();
};

const exportExcel = (data) => {
  // Simple TSV that Excel can open
  const cols = ["ObjectId","HostUID","Date","Streamer","Gender","Views","Status"];
  const rows = data.map((r) => cols.map((c) => r[c]).join("\t"));
  const blob = new Blob([cols.join("\t") + "\n" + rows.join("\n")], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "streaming_export.xls"; a.click();
};

const exportPDF = (data) => {
  const cols = ["ObjectId","HostUID","Date","Streamer","Gender","Views","Status"];
  const rows = data.map((r) => `<tr>${cols.map((c) => `<td>${r[c]}</td>`).join("")}</tr>`).join("");
  const html = `<html><head><style>
    body{font-family:sans-serif;font-size:11px}
    h2{margin-bottom:12px;color:#1e293b}
    table{width:100%;border-collapse:collapse}
    th{background:#1e3a5f;color:white;padding:7px 10px;text-align:left;font-size:10px}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155}
    tr:nth-child(even)td{background:#f8fafc}
  </style></head><body>
    <h2>Streaming Report — ${new Date().toLocaleDateString()}</h2>
    <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody></table>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html); w.document.close(); w.print();
};

const copyToClipboard = (data) => {
  const cols = ["ObjectId","HostUID","Date","Streamer","Gender","Views","Status"];
  const rows = data.map((r) => cols.map((c) => r[c]).join("\t"));
  const text = cols.join("\t") + "\n" + rows.join("\n");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  });
};

/* ══════════════════════════════════════════
   TOGGLE COMPONENT
══════════════════════════════════════════ */
const LiveToggle = ({ checked, onChange, disabled }) => (
  <div className="st-toggle-wrap">
    <label className="st-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <div className="st-toggle-track">
        <div className="st-toggle-thumb" />
      </div>
    </label>
    <span className={`st-toggle-label ${checked ? "on" : "off"}`}>
      {checked ? "Live" : "Off"}
    </span>
  </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function StreamingTable() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [toggling, setToggling]   = useState({}); // id → bool
  const [search, setSearch]       = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [toast, setToast]         = useState("");
  const searchRef = useRef(null);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new Parse.Query(Parse.Object.extend("Streaming"));
      query.descending("createdAt");
      query.limit(1000);
      const results = await query.find();
      setRows(results);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Toggle live status ── */
  const handleToggle = useCallback(async (item) => {
    const id      = item.id;
    const current = item.get("isLive") ?? false;
    setToggling((prev) => ({ ...prev, [id]: true }));
    try {
      item.set("isLive", !current);
      await item.save();
      setRows((prev) =>
        prev.map((r) => (r.id === id ? item : r))
      );
    } catch (err) {
      console.error("Toggle error:", err);
      item.set("isLive", current); // rollback
    } finally {
      setToggling((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  /* ── Search filter ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const uid = (r.get("hostUID") || r.get("userId") || r.get("uid") || "").toLowerCase();
      const oid = r.id.toLowerCase();
      return uid.includes(q) || oid.includes(q);
    });
  }, [rows, search]);

  /* Reset page on search/perPage change */
  useEffect(() => { setCurrentPage(1); }, [search, perPage]);

  /* ── Pagination ── */
  const totalPages   = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage     = Math.min(currentPage, totalPages);
  const indexFirst   = (safePage - 1) * perPage;
  const pageItems    = filtered.slice(indexFirst, indexFirst + perPage);
  const startIdx     = filtered.length === 0 ? 0 : indexFirst + 1;
  const endIdx       = Math.min(indexFirst + perPage, filtered.length);

  /* ── Export (uses ALL filtered rows, not just current page) ── */
  const exportData   = useMemo(() => filtered.map(rowToExportObj), [filtered]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const handleCopy = useCallback(() => {
    copyToClipboard(exportData);
    showToast("✓ Copied to clipboard!");
  }, [exportData, showToast]);

  /* ── Page number buttons (max 7 visible) ── */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (safePage > 3) pages.push("…");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  /* ── Render helpers ── */
  const renderGender = (g) => {
    if (!g) return "—";
    const lower = g.toLowerCase();
    const cls   = lower === "male" ? "male" : lower === "female" ? "female" : "other";
    const icon  = lower === "male" ? Icons.male : lower === "female" ? Icons.female : "⚧";
    return <span className={`st-gender ${cls}`}>{icon} {g}</span>;
  };

  const getUID = (item) =>
    item.get("hostUID") || item.get("userId") || item.get("uid") || "—";

  const getStreamer = (item) =>
    item.get("streamerName") || item.get("name") || item.get("username") || "Unknown";

  const getViews = (item) =>
    item.get("views") ?? item.get("viewCount") ?? null;

  const getIsLive = (item) =>
    item.get("isLive") ?? item.get("status") ?? false;

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="st-page">
      <div className="st-inner">

        {/* ── HEADER ── */}
        <div className="st-header">
          <div className="st-header-left">
            <div className="st-logo">{Icons.stream}</div>
            <div>
              <div className="st-page-title">Streaming Sessions</div>
              <div className="st-page-sub">Manage & monitor all active streams</div>
            </div>
          </div>
          <div className="st-live-pill">
            <span className="st-live-dot" />
            {rows.filter((r) => getIsLive(r)).length} Live Now
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="st-toolbar">
          {/* Search */}
          <div className="st-search-wrap">
            <span className="st-search-icon">{Icons.search}</span>
            <input
              ref={searchRef}
              className="st-search"
              type="text"
              placeholder="Search by UID or Object ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="st-search-clear" onClick={() => setSearch("")} type="button">
                {Icons.close}
              </button>
            )}
          </div>

          {/* Export */}
          <div className="st-export-group">
            <button className="st-exp-btn copy" onClick={handleCopy} type="button">
              {Icons.copy} <span>Copy</span>
            </button>
            <button className="st-exp-btn excel" onClick={() => exportExcel(exportData)} type="button">
              {Icons.excel} <span>Excel</span>
            </button>
            <button className="st-exp-btn pdf" onClick={() => exportPDF(exportData)} type="button">
              {Icons.pdf} <span>PDF</span>
            </button>
            <button className="st-exp-btn csv" onClick={() => exportCSV(exportData)} type="button">
              {Icons.csv} <span>CSV</span>
            </button>
          </div>

          {/* Results info */}
          <div className="st-results-info">
            <strong>{filtered.length}</strong> of {rows.length} records
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="st-card">

          {loading ? (
            <div className="st-loading">
              <div className="st-spinner" />
              Loading streaming sessions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="st-empty">
              <div className="st-empty-icon">📡</div>
              <div className="st-empty-title">
                {search ? "No results found" : "No sessions yet"}
              </div>
              <div className="st-empty-desc">
                {search
                  ? `No records match "${search}"`
                  : "Streaming sessions will appear here once created."}
              </div>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="st-table-scroll">
                <table className="st-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Host UID</th>
                      <th>Date</th>
                      <th>Streamer</th>
                      <th>Gender</th>
                      <th>Views</th>
                      <th>Live Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const name    = getStreamer(item);
                      const uid     = getUID(item);
                      const isLive  = getIsLive(item);
                      const views   = getViews(item);
                      const gender  = item.get("gender");
                      return (
                        <tr key={item.id}>
                          <td style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>
                            {indexFirst + idx + 1}
                          </td>
                          <td>
                            <span
                              className="st-oid"
                              title={item.id}
                              onClick={() => { navigator.clipboard?.writeText(item.id); showToast("✓ Object ID copied!"); }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td>
                            <span className="st-uid">{uid}</span>
                          </td>
                          <td>
                            <span className="st-date">{fmtDate(item.get("createdAt"))}</span>
                          </td>
                          <td>
                            <div className="st-streamer">
                              <div className="st-avatar" style={{ background: avatarColor(name) }}>
                                {initials(name)}
                              </div>
                              <span className="st-streamer-name">{name}</span>
                            </div>
                          </td>
                          <td>{renderGender(gender)}</td>
                          <td>
                            <span className="st-views">
                              {fmtViews(views)}
                            </span>
                          </td>
                          <td>
                            <LiveToggle
                              checked={isLive}
                              onChange={() => handleToggle(item)}
                              disabled={!!toggling[item.id]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD LIST ── */}
              <div className="st-card-list">
                {pageItems.map((item, idx) => {
                  const name   = getStreamer(item);
                  const uid    = getUID(item);
                  const isLive = getIsLive(item);
                  const views  = getViews(item);
                  const gender = item.get("gender");
                  return (
                    <div key={item.id} className="st-row-card">
                      {/* Card top: streamer + status */}
                      <div className="st-row-card-top">
                        <div className="st-streamer">
                          <div className="st-avatar" style={{ background: avatarColor(name) }}>
                            {initials(name)}
                          </div>
                          <div>
                            <div className="st-streamer-name">{name}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 2 }}>
                              #{indexFirst + idx + 1}
                            </div>
                          </div>
                        </div>
                        <LiveToggle
                          checked={isLive}
                          onChange={() => handleToggle(item)}
                          disabled={!!toggling[item.id]}
                        />
                      </div>

                      {/* Card body grid */}
                      <div className="st-row-card-grid">
                        <div className="st-row-card-field">
                          <span className="st-row-card-label">Object ID</span>
                          <span
                            className="st-oid"
                            title={item.id}
                            onClick={() => { navigator.clipboard?.writeText(item.id); showToast("✓ Copied!"); }}
                          >
                            {item.id}
                          </span>
                        </div>
                        <div className="st-row-card-field">
                          <span className="st-row-card-label">Host UID</span>
                          <span className="st-uid" style={{ fontSize: "0.78rem" }}>{uid}</span>
                        </div>
                        <div className="st-row-card-field">
                          <span className="st-row-card-label">Date</span>
                          <span className="st-row-card-value">{fmtDate(item.get("createdAt"))}</span>
                        </div>
                        <div className="st-row-card-field">
                          <span className="st-row-card-label">Gender</span>
                          <span className="st-row-card-value">{renderGender(gender)}</span>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="st-row-card-footer">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "var(--text-3)", display: "flex" }}>{Icons.views}</span>
                          <span className="st-views">{fmtViews(views)} views</span>
                        </div>
                        <span className={`st-status-badge ${isLive ? "on" : "off"}`}>
                          <span className="st-status-dot" />
                          {isLive ? "Live" : "Offline"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION FOOTER ── */}
          {!loading && filtered.length > 0 && (
            <div className="st-footer">
              {/* Per page selector */}
              <div className="st-per-page">
                <span>Show</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>per page</span>
              </div>

              {/* Info */}
              <div className="st-footer-info">
                Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong>
              </div>

              {/* Page buttons */}
              <div className="st-pages">
                <button
                  className="st-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  type="button"
                  aria-label="Previous"
                >
                  {Icons.prev}
                </button>

                {pageNumbers.map((p, i) =>
                  p === "…" ? (
                    <button key={`ellipsis-${i}`} className="st-page-btn" disabled type="button">…</button>
                  ) : (
                    <button
                      key={p}
                      className={`st-page-btn ${safePage === p ? "active" : ""}`}
                      onClick={() => setCurrentPage(p)}
                      type="button"
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="st-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  type="button"
                  aria-label="Next"
                >
                  {Icons.next}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── TOAST ── */}
      {toast && <div className="st-toast">{toast}</div>}
    </div>
  );
}