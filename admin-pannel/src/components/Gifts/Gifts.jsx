// Gifts.jsx
import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./Gifts.css";

/* ══════════════════════════════════════════
   ICONS
══════════════════════════════════════════ */
const Ic = {
  gift:   <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  search: <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  close:  <svg width="9" height="9" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  copy:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  csv:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  excel:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 15l2-3 2 3M11 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  print:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8"/><rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  edit:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  trash:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  save:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8"/><path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  coin:   "🪙",
  prev:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  next:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const GRADIENTS = [
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#14b8a6,#3b82f6)",
  "linear-gradient(135deg,#f43f5e,#f97316)",
  "linear-gradient(135deg,#10b981,#14b8a6)",
  "linear-gradient(135deg,#38bdf8,#8b5cf6)",
];

const avatarGrad = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return GRADIENTS[h % GRADIENTS.length];
};

const catClass = (cat = "") => {
  const cats = ["cat-0","cat-1","cat-2","cat-3","cat-4","cat-5"];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h += cat.charCodeAt(i);
  return cats[h % cats.length];
};

const initials = (name = "") =>
  name ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "—";

const fmtCredits = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
};

/* ══════════════════════════════════════════
   EXPORT UTILS
══════════════════════════════════════════ */
const toRows = (items) =>
  items.map((r) => ({
    ObjectId: r.id,
    Date:     fmtDate(r.get("createdAt")),
    Name:     r.get("name") || r.get("giftName") || r.get("title") || "—",
    Category: r.get("category") || r.get("type") || "—",
    Credits:  r.get("credits") ?? r.get("price") ?? r.get("coins") ?? 0,
  }));

const doCSV = (items) => {
  const cols = ["ObjectId","Date","Name","Category","Credits"];
  const rows = toRows(items).map((r) =>
    cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "gifts_export.csv"; a.click();
};

const doExcel = (el) => {
  if (!el) return;
  const uri = "data:application/vnd.ms-excel," + encodeURIComponent(el.outerHTML);
  const a = document.createElement("a"); a.href = uri;
  a.download = "gifts_export.xls"; a.click();
};

const doPDF = (items) => {
  const cols = ["ObjectId","Date","Name","Category","Credits"];
  const data = toRows(items);
  const ths  = cols.map((c) => `<th>${c}</th>`).join("");
  const trs  = data.map((r) =>
    `<tr>${cols.map((c) => `<td>${r[c]}</td>`).join("")}</tr>`
  ).join("");
  const html = `<html><head><style>
    body{font-family:sans-serif;font-size:10px;color:#1e293b}
    h2{font-size:14px;margin-bottom:6px;color:#0f172a}
    p{font-size:9px;color:#64748b;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    th{background:#07090f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:.06em}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#1e293b}
    tr:nth-child(even) td{background:#fafafa}
  </style></head><body>
    <h2>🎁 Gifts / Credits Export</h2>
    <p>Generated ${new Date().toLocaleString()} · ${items.length} records</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html); w.document.close(); w.print();
};

const doCopy = (items) => {
  const cols = ["ObjectId","Date","Name","Category","Credits"];
  const rows = toRows(items).map((r) => cols.map((c) => r[c]).join("\t"));
  const text = cols.join("\t") + "\n" + rows.join("\n");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  });
};

/* ══════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════ */
const EditModal = ({ item, categories, onClose, onSaved, showToast }) => {
  const [name,     setName]     = useState(item.get("name")     || item.get("giftName") || item.get("title") || "");
  const [category, setCategory] = useState(item.get("category") || item.get("type")     || "");
  const [credits,  setCredits]  = useState(String(item.get("credits") ?? item.get("price") ?? item.get("coins") ?? ""));
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Set whichever field exists on the object
      if (item.get("name")     !== undefined || !item.get("giftName") && !item.get("title")) item.set("name", name);
      if (item.get("giftName") !== undefined) item.set("giftName", name);
      if (item.get("title")    !== undefined) item.set("title", name);
      if (item.get("category") !== undefined) item.set("category", category);
      if (item.get("type")     !== undefined) item.set("type", category);
      const c = parseFloat(credits);
      if (!isNaN(c)) {
        if (item.get("credits") !== undefined) item.set("credits", c);
        if (item.get("price")   !== undefined) item.set("price", c);
        if (item.get("coins")   !== undefined) item.set("coins", c);
      }
      await item.save();
      showToast("✓ Gift updated successfully");
      onSaved(item);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("✗ Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gf-modal">
        <div className="gf-modal-header">
          <div className="gf-modal-title">{Ic.edit} Edit Gift</div>
          <button className="gf-modal-close" onClick={onClose} type="button">{Ic.close}</button>
        </div>

        <div className="gf-form-field">
          <label className="gf-form-label">Object ID</label>
          <input className="gf-form-input" value={item.id} readOnly
            style={{ opacity: 0.5, cursor: "not-allowed", fontFamily: "var(--mono)", fontSize: "0.75rem" }} />
        </div>

        <div className="gf-form-field">
          <label className="gf-form-label">Name</label>
          <input className="gf-form-input" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Gift name" />
        </div>

        <div className="gf-form-field">
          <label className="gf-form-label">Category</label>
          {categories.length > 1 ? (
            <select className="gf-form-select" value={category}
              onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {categories.filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input className="gf-form-input" value={category}
              onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Special, Premium…" />
          )}
        </div>

        <div className="gf-form-field">
          <label className="gf-form-label">Credits / Price</label>
          <input className="gf-form-input" type="number" min="0" step="any"
            value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="0" />
        </div>

        <div className="gf-modal-footer">
          <button className="gf-modal-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="gf-modal-save" onClick={handleSave} disabled={saving} type="button">
            {Ic.save} {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   CATEGORY BADGE
══════════════════════════════════════════ */
const CategoryBadge = ({ value }) => (
  <span className={`gf-category ${catClass(value)}`}>
    <span className="gf-category-dot" />
    {value || "Uncategorized"}
  </span>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Gifts() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [page,      setPage]      = useState(0);
  const [perPage,   setPerPage]   = useState(10);
  const [editItem,  setEditItem]  = useState(null);
  const [toast,     setToast]     = useState("");
  const tableRef = useRef(null);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new Parse.Query(Parse.Object.extend("Gifts"));
      query.descending("createdAt");
      query.limit(2000);
      const results = await query.find();
      setRows(results);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [search, catFilter, perPage]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  /* ── Field getters ── */
  const getName     = (r) => r.get("name")     || r.get("giftName") || r.get("title")    || "—";
  const getCategory = (r) => r.get("category") || r.get("type")     || "";
  const getCredits  = (r) => r.get("credits")  ?? r.get("price")    ?? r.get("coins")    ?? null;

  /* ── Unique categories for filter pills ── */
  const categories = useMemo(() => {
    const s = new Set(rows.map((r) => getCategory(r)).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  /* ── Total credits ── */
  const totalCredits = useMemo(() =>
    rows.reduce((acc, r) => acc + (getCredits(r) || 0), 0),
  [rows]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter !== "All") {
      list = list.filter((r) => getCategory(r) === catFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const oid  = r.id.toLowerCase();
      const name = getName(r).toLowerCase();
      const cat  = getCategory(r).toLowerCase();
      return oid.includes(q) || name.includes(q) || cat.includes(q);
    });
  }, [rows, search, catFilter]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  const startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  const endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  /* ── Smart page numbers ── */
  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const arr = [0];
    if (safePage > 2) arr.push("…");
    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) arr.push(i);
    if (safePage < totalPages - 3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  /* ── Delete ── */
  const handleDelete = useCallback(async (item) => {
    if (!window.confirm(`Delete "${getName(item)}"?`)) return;
    try {
      await item.destroy();
      setRows((prev) => prev.filter((r) => r.id !== item.id));
      showToast("✓ Gift deleted");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("✗ Failed to delete");
    }
  }, [showToast]);

  /* ── After edit ── */
  const handleSaved = useCallback((updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="gf-page">
      <div className="gf-topline" />
      <div className="gf-inner">

        {/* ── HEADER ── */}
        <div className="gf-header">
          <div className="gf-header-left">
            <div className="gf-logo">{Ic.gift}</div>
            <div>
              <div className="gf-page-title">Gifts</div>
              <div className="gf-page-sub">Manage gift items, categories &amp; credit values</div>
            </div>
          </div>
          <div className="gf-header-chips">
            <div className="gf-chip total">🎁 {rows.length} gifts</div>
            <div className="gf-chip credits">{Ic.coin} {fmtCredits(totalCredits)} credits</div>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="gf-toolbar">
          {/* Search */}
          <div className="gf-search-wrap">
            <span className="gf-search-icon">{Ic.search}</span>
            <input
              className="gf-search"
              type="text"
              placeholder="Search by ID, name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="gf-search-clear" onClick={() => setSearch("")} type="button">
                {Ic.close}
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="gf-filter-group">
            <button
              className={`gf-filter-btn ${catFilter === "All" ? "active" : ""}`}
              onClick={() => setCatFilter("All")}
              type="button"
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`gf-filter-btn ${catFilter === cat ? "active" : ""}`}
                onClick={() => setCatFilter(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exports */}
          <div className="gf-export-group">
            <button className="gf-exp copy" type="button"
              onClick={() => { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {Ic.copy} <span>Copy</span>
            </button>
            <button className="gf-exp csv" type="button" onClick={() => doCSV(filtered)}>
              {Ic.csv} <span>CSV</span>
            </button>
            <button className="gf-exp excel" type="button" onClick={() => doExcel(tableRef.current)}>
              {Ic.excel} <span>Excel</span>
            </button>
            <button className="gf-exp pdf" type="button" onClick={() => doPDF(filtered)}>
              {Ic.pdf} <span>PDF</span>
            </button>
            <button className="gf-exp print" type="button" onClick={() => window.print()}>
              {Ic.print} <span>Print</span>
            </button>
          </div>
        </div>

        {/* ── SUMMARY BAR ── */}
        <div className="gf-summary">
          <div className="gf-results-info">
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> gifts
            {search && ` matching "${search}"`}
            {catFilter !== "All" && ` in "${catFilter}"`}
          </div>
          <div className="gf-per-page-wrap">
            <span>Rows:</span>
            <select
              className="gf-per-page-select"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="gf-card">

          {loading ? (
            <div className="gf-loading">
              <div className="gf-spinner" />
              Loading gifts…
            </div>
          ) : filtered.length === 0 ? (
            <div className="gf-empty">
              <div className="gf-empty-icon">🎁</div>
              <div className="gf-empty-title">
                {search || catFilter !== "All" ? "No results found" : "No gifts yet"}
              </div>
              <div className="gf-empty-desc">
                {search
                  ? `Nothing matches "${search}"`
                  : catFilter !== "All"
                    ? `No gifts in the "${catFilter}" category`
                    : "Gift items will appear here once added."}
              </div>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="gf-table-scroll">
                <table className="gf-table" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Credits</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const name     = getName(item);
                      const category = getCategory(item);
                      const credits  = getCredits(item);
                      return (
                        <tr key={item.id}>
                          <td><span className="gf-num">{startIdx + idx}</span></td>
                          <td>
                            <span
                              className="gf-oid"
                              title={`Click to copy: ${item.id}`}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.id);
                                showToast("✓ Object ID copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td><span className="gf-date">{fmtDate(item.get("createdAt"))}</span></td>
                          <td>
                            <div className="gf-name-cell">
                              <div className="gf-avatar" style={{ background: avatarGrad(name) }}>
                                {initials(name)}
                              </div>
                              <span className="gf-item-name">{name}</span>
                            </div>
                          </td>
                          <td><CategoryBadge value={category} /></td>
                          <td>
                            <span className="gf-credits">
                              <span className="gf-credits-icon">{Ic.coin}</span>
                              {fmtCredits(credits)}
                            </span>
                          </td>
                          <td>
                            <div className="gf-actions">
                              <button className="gf-btn-edit" type="button"
                                onClick={() => setEditItem(item)}>
                                {Ic.edit} Edit
                              </button>
                              <button className="gf-btn-del" type="button"
                                onClick={() => handleDelete(item)}>
                                {Ic.trash} Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARD LIST ── */}
              <div className="gf-card-list">
                {pageItems.map((item, idx) => {
                  const name     = getName(item);
                  const category = getCategory(item);
                  const credits  = getCredits(item);
                  return (
                    <div key={item.id} className="gf-row-card">
                      <div className="gf-card-body" style={{ padding: "14px 15px" }}>
                        {/* Top: name + category */}
                        <div className="gf-card-top">
                          <div className="gf-name-cell">
                            <div
                              className="gf-avatar"
                              style={{ background: avatarGrad(name), width: 38, height: 38, borderRadius: "var(--r-sm)" }}
                            >
                              {initials(name)}
                            </div>
                            <div>
                              <div className="gf-item-name">{name}</div>
                              <div style={{ fontSize: "0.68rem", color: "var(--text-4)", marginTop: 2 }}>
                                #{startIdx + idx}
                              </div>
                            </div>
                          </div>
                          <CategoryBadge value={category} />
                        </div>

                        {/* Credits — prominent */}
                        <div style={{
                          background: "var(--gold-dim)",
                          border: "1px solid var(--gold-border)",
                          borderRadius: "var(--r-sm)",
                          padding: "10px 14px",
                          marginBottom: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-4)" }}>
                            Credits
                          </span>
                          <span className="gf-card-credits-value">
                            {Ic.coin} {fmtCredits(credits)}
                          </span>
                        </div>

                        {/* Meta grid */}
                        <div className="gf-card-meta">
                          <div className="gf-card-field">
                            <span className="gf-card-field-label">Object ID</span>
                            <span
                              className="gf-oid"
                              style={{ maxWidth: "100%", fontSize: "0.67rem" }}
                              title={item.id}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.id);
                                showToast("✓ Copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </div>
                          <div className="gf-card-field">
                            <span className="gf-card-field-label">Date</span>
                            <span className="gf-card-field-value">{fmtDate(item.get("createdAt"))}</span>
                          </div>
                        </div>

                        {/* Footer actions */}
                        <div className="gf-card-footer">
                          <button className="gf-btn-edit" type="button"
                            onClick={() => setEditItem(item)}>
                            {Ic.edit} Edit
                          </button>
                          <button className="gf-btn-del" type="button"
                            onClick={() => handleDelete(item)}>
                            {Ic.trash} Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION FOOTER ── */}
          {!loading && filtered.length > 0 && (
            <div className="gf-footer">
              <div className="gf-footer-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> gifts
              </div>

              <div className="gf-pages">
                <button className="gf-page-btn" type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0} aria-label="Previous">
                  {Ic.prev}
                </button>

                {pageNums.map((p, i) =>
                  p === "…"
                    ? <button key={`el-${i}`} className="gf-page-btn" disabled type="button">…</button>
                    : <button key={p}
                        className={`gf-page-btn ${safePage === p ? "active" : ""}`}
                        onClick={() => setPage(p)} type="button">
                        {p + 1}
                      </button>
                )}

                <button className="gf-page-btn" type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1} aria-label="Next">
                  {Ic.next}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <EditModal
          item={editItem}
          categories={categories}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* ── TOAST ── */}
      {toast && <div className="gf-toast">{toast}</div>}
    </div>
  );
}