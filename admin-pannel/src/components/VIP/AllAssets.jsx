// AllAssets.jsx
import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./AllAssets.css";

/* ══════════════════════════════════════════
   ICONS
══════════════════════════════════════════ */
const Ic = {
  assets: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
      <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  close: (
    <svg width="9" height="9" fill="none" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  copy: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  csv: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  excel: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 15l2-3 2 3M11 12v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  pdf: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  print: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        stroke="currentColor" strokeWidth="1.8"/>
      <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  edit: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  trash: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  save: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
        stroke="currentColor" strokeWidth="1.8"/>
      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  prev: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  next: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const GRADIENTS = [
  "linear-gradient(135deg,#00e676,#00897b)",
  "linear-gradient(135deg,#b388ff,#7c4dff)",
  "linear-gradient(135deg,#40c4ff,#0091ea)",
  "linear-gradient(135deg,#ff5252,#d50000)",
  "linear-gradient(135deg,#ffab40,#ff6d00)",
  "linear-gradient(135deg,#ffd600,#ff6f00)",
  "linear-gradient(135deg,#69f0ae,#00bfa5)",
  "linear-gradient(135deg,#f48fb1,#ad1457)",
  "linear-gradient(135deg,#80d8ff,#006064)",
];

const avatarGrad = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return GRADIENTS[h % GRADIENTS.length];
};

const catClass = (cat = "") => {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h += cat.charCodeAt(i);
  return `aa-cat-${h % 9}`;
};

const initials = (name = "") =>
  name ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "—";

/* ══════════════════════════════════════════
   EXPORT UTILITIES
══════════════════════════════════════════ */
const toRows = (items) =>
  items.map((r) => ({
    ObjectId: r.id,
    Date:     fmtDate(r.get("createdAt")),
    Name:     r.get("name") || r.get("assetName") || r.get("title") || "—",
    Category: r.get("category") || r.get("type") || "—",
    VIP:      (r.get("isVip") || r.get("vip") || r.get("isVIP")) ? "Yes" : "No",
  }));

const doCSV = (items) => {
  const cols = ["ObjectId", "Date", "Name", "Category", "VIP"];
  const rows = toRows(items).map((r) =>
    cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "assets_export.csv";
  a.click();
};

const doExcel = (el) => {
  if (!el) return;
  const uri = "data:application/vnd.ms-excel," + encodeURIComponent(el.outerHTML);
  const a = document.createElement("a");
  a.href = uri;
  a.download = "assets_export.xls";
  a.click();
};

const doPDF = (items) => {
  const cols = ["ObjectId", "Date", "Name", "Category", "VIP"];
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
    th{background:#080c0e;color:#fff;padding:7px 10px;text-align:left;
       font-size:9px;letter-spacing:.06em;text-transform:uppercase}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#1e293b}
    tr:nth-child(even) td{background:#f8fafc}
  </style></head><body>
    <h2>All Assets Export</h2>
    <p>Generated ${new Date().toLocaleString()} &middot; ${items.length} records</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
};

const doCopy = (items) => {
  const cols = ["ObjectId", "Date", "Name", "Category", "VIP"];
  const rows = toRows(items).map((r) => cols.map((c) => r[c]).join("\t"));
  const text = cols.join("\t") + "\n" + rows.join("\n");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
};

/* ══════════════════════════════════════════
   VIP BADGE
══════════════════════════════════════════ */
const VipBadge = ({ value }) =>
  value ? (
    <span className="aa-vip-yes">👑 VIP</span>
  ) : (
    <span className="aa-vip-no">— Standard</span>
  );

/* ══════════════════════════════════════════
   CATEGORY BADGE
══════════════════════════════════════════ */
const CatBadge = ({ value }) => (
  <span className={`aa-category ${catClass(value)}`}>
    <span className="aa-cat-dot" />
    {value || "Uncategorized"}
  </span>
);

/* ══════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════ */
const EditModal = ({ item, categories, onClose, onSaved, showToast }) => {
  const getName     = (r) => r.get("name")     || r.get("assetName") || r.get("title")    || "";
  const getCategory = (r) => r.get("category") || r.get("type")      || "";
  const getIsVip    = (r) => !!(r.get("isVip") || r.get("vip")       || r.get("isVIP"));

  const [name,     setName]     = useState(getName(item));
  const [category, setCategory] = useState(getCategory(item));
  const [isVip,    setIsVip]    = useState(getIsVip(item));
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (item.get("name")      !== undefined) item.set("name",      name);
      if (item.get("assetName") !== undefined) item.set("assetName", name);
      if (item.get("title")     !== undefined) item.set("title",     name);
      if (item.get("category")  !== undefined) item.set("category",  category);
      if (item.get("type")      !== undefined) item.set("type",      category);
      if (item.get("isVip")     !== undefined) item.set("isVip",     isVip);
      if (item.get("vip")       !== undefined) item.set("vip",       isVip);
      if (item.get("isVIP")     !== undefined) item.set("isVIP",     isVip);
      await item.save();
      showToast("✓ Asset updated successfully");
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
    <div className="aa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="aa-modal">
        <div className="aa-modal-header">
          <div className="aa-modal-title">{Ic.edit} Edit Asset</div>
          <button className="aa-modal-close" onClick={onClose} type="button">{Ic.close}</button>
        </div>

        {/* Object ID — read only */}
        <div className="aa-form-field">
          <label className="aa-form-label">Object ID</label>
          <input
            className="aa-form-input"
            value={item.id}
            readOnly
            style={{ opacity: 0.45, cursor: "not-allowed", fontFamily: "var(--mono)", fontSize: "0.74rem" }}
          />
        </div>

        {/* Name */}
        <div className="aa-form-field">
          <label className="aa-form-label">Name</label>
          <input
            className="aa-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Asset name"
          />
        </div>

        {/* Category */}
        <div className="aa-form-field">
          <label className="aa-form-label">Category</label>
          {categories.length > 1 ? (
            <select
              className="aa-form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category…</option>
              {categories.filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              className="aa-form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Love, Game, VIP…"
            />
          )}
        </div>

        {/* VIP Toggle */}
        <div className="aa-form-field">
          <label className="aa-form-label">VIP Status</label>
          <div
            className={`aa-vip-toggle-row${isVip ? " on" : ""}`}
            onClick={() => setIsVip((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setIsVip((v) => !v)}
          >
            <span className="aa-vip-toggle-label">
              {isVip ? "👑 VIP — Exclusive access" : "🔓 Standard — Public access"}
            </span>
            <div className={`aa-toggle-switch${isVip ? " on" : ""}`}>
              <div className="aa-toggle-thumb" />
            </div>
          </div>
        </div>

        <div className="aa-modal-footer">
          <button className="aa-modal-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="aa-modal-save" onClick={handleSave} disabled={saving} type="button">
            {Ic.save} {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function AllAssets() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [vipFilter, setVipFilter] = useState(false);
  const [page,      setPage]      = useState(0);
  const [perPage,   setPerPage]   = useState(10);
  const [editItem,  setEditItem]  = useState(null);
  const [toast,     setToast]     = useState("");
  const tableRef = useRef(null);

  /* ── Field getters ── */
  const getName     = (r) => r.get("name")     || r.get("assetName") || r.get("title")   || "—";
  const getCategory = (r) => r.get("category") || r.get("type")      || "";
  const getIsVip    = (r) => !!(r.get("isVip") || r.get("vip")       || r.get("isVIP"));

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new Parse.Query(Parse.Object.extend("Assets"));
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
  useEffect(() => { setPage(0); }, [search, catFilter, vipFilter, perPage]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  /* ── Categories list ── */
  const categories = useMemo(() => {
    const s = new Set(rows.map((r) => getCategory(r)).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  /* ── Stats ── */
  const vipCount = useMemo(() => rows.filter((r) => getIsVip(r)).length, [rows]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter !== "All") list = list.filter((r) => getCategory(r) === catFilter);
    if (vipFilter)           list = list.filter((r) => getIsVip(r));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const oid  = r.id.toLowerCase();
      const name = getName(r).toLowerCase();
      const cat  = getCategory(r).toLowerCase();
      return oid.includes(q) || name.includes(q) || cat.includes(q);
    });
  }, [rows, search, catFilter, vipFilter]);

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
      showToast("✓ Asset deleted");
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
    <div className="aa-page">
      <div className="aa-topline" />
      <div className="aa-inner">

        {/* ── HEADER ── */}
        <div className="aa-header">
          <div className="aa-header-left">
            <div className="aa-logo">{Ic.assets}</div>
            <div>
              <div className="aa-page-title">All Assets</div>
              <div className="aa-page-sub">Browse, manage and export your asset library</div>
            </div>
          </div>
          <div className="aa-header-chips">
            <div className="aa-chip total">📦 {rows.length} assets</div>
            <div className="aa-chip vip">👑 {vipCount} VIP</div>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="aa-toolbar">
          {/* Search */}
          <div className="aa-search-wrap">
            <span className="aa-search-icon">{Ic.search}</span>
            <input
              className="aa-search"
              type="text"
              placeholder="Search by ID, name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="aa-search-clear" onClick={() => setSearch("")} type="button">
                {Ic.close}
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="aa-filter-group">
            <button
              className={`aa-filter-btn ${catFilter === "All" && !vipFilter ? "active" : ""}`}
              onClick={() => { setCatFilter("All"); setVipFilter(false); }}
              type="button"
            >
              All
            </button>
            <button
              className={`aa-filter-btn vip-filter ${vipFilter ? "active" : ""}`}
              onClick={() => { setVipFilter((v) => !v); setCatFilter("All"); }}
              type="button"
            >
              👑 VIP Only
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`aa-filter-btn ${catFilter === cat ? "active" : ""}`}
                onClick={() => { setCatFilter(cat); setVipFilter(false); }}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exports */}
          <div className="aa-export-group">
            <button className="aa-exp copy" type="button"
              onClick={() => { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {Ic.copy} <span>Copy</span>
            </button>
            <button className="aa-exp csv" type="button" onClick={() => doCSV(filtered)}>
              {Ic.csv} <span>CSV</span>
            </button>
            <button className="aa-exp excel" type="button" onClick={() => doExcel(tableRef.current)}>
              {Ic.excel} <span>Excel</span>
            </button>
            <button className="aa-exp pdf" type="button" onClick={() => doPDF(filtered)}>
              {Ic.pdf} <span>PDF</span>
            </button>
            <button className="aa-exp print" type="button" onClick={() => window.print()}>
              {Ic.print} <span>Print</span>
            </button>
          </div>
        </div>

        {/* ── SUMMARY BAR ── */}
        <div className="aa-summary">
          <div className="aa-results-info">
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> assets
            {search && ` matching "${search}"`}
            {catFilter !== "All" && ` in "${catFilter}"`}
            {vipFilter && " · VIP only"}
          </div>
          <div className="aa-per-page-wrap">
            <span>Rows:</span>
            <select
              className="aa-per-page-select"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="aa-card">

          {loading ? (
            <div className="aa-loading">
              <div className="aa-spinner" />
              Loading assets…
            </div>
          ) : filtered.length === 0 ? (
            <div className="aa-empty">
              <div className="aa-empty-icon">📦</div>
              <div className="aa-empty-title">
                {search || catFilter !== "All" || vipFilter ? "No results found" : "No assets yet"}
              </div>
              <div className="aa-empty-desc">
                {search
                  ? `Nothing matches "${search}"`
                  : vipFilter
                    ? "No VIP assets found"
                    : catFilter !== "All"
                      ? `No assets in "${catFilter}"`
                      : "Assets will appear here once added."}
              </div>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="aa-table-scroll">
                <table className="aa-table" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>VIP</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const name     = getName(item);
                      const category = getCategory(item);
                      const isVip    = getIsVip(item);
                      return (
                        <tr key={item.id}>
                          <td><span className="aa-num">{startIdx + idx}</span></td>
                          <td>
                            <span
                              className="aa-oid"
                              title={`Click to copy: ${item.id}`}
                              onClick={() => {
                                navigator.clipboard?.writeText(item.id);
                                showToast("✓ Object ID copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td><span className="aa-date">{fmtDate(item.get("createdAt"))}</span></td>
                          <td>
                            <div className="aa-name-cell">
                              <div className="aa-avatar" style={{ background: avatarGrad(name) }}>
                                {initials(name)}
                              </div>
                              <span className="aa-item-name">{name}</span>
                            </div>
                          </td>
                          <td><CatBadge value={category} /></td>
                          <td><VipBadge value={isVip} /></td>
                          <td>
                            <div className="aa-actions">
                              <button className="aa-btn-edit" type="button"
                                onClick={() => setEditItem(item)}>
                                {Ic.edit} Edit
                              </button>
                              <button className="aa-btn-del" type="button"
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
              <div className="aa-card-list">
                {pageItems.map((item, idx) => {
                  const name     = getName(item);
                  const category = getCategory(item);
                  const isVip    = getIsVip(item);
                  return (
                    <div key={item.id} className={`aa-row-card${isVip ? " is-vip" : ""}`}>
                      {/* Top: name + VIP badge */}
                      <div className="aa-card-top">
                        <div className="aa-name-cell">
                          <div
                            className="aa-avatar"
                            style={{ background: avatarGrad(name), width: 36, height: 36, fontSize: "0.68rem" }}
                          >
                            {initials(name)}
                          </div>
                          <div>
                            <div className="aa-item-name" style={{ fontSize: "0.88rem" }}>{name}</div>
                            <div style={{ fontSize: "0.67rem", color: "var(--text-4)", marginTop: 1 }}>
                              #{startIdx + idx}
                            </div>
                          </div>
                        </div>
                        <VipBadge value={isVip} />
                      </div>

                      {/* Meta grid */}
                      <div className="aa-card-meta">
                        <div className="aa-card-field">
                          <span className="aa-card-field-label">Object ID</span>
                          <span
                            className="aa-oid"
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
                        <div className="aa-card-field">
                          <span className="aa-card-field-label">Date</span>
                          <span className="aa-card-field-value">{fmtDate(item.get("createdAt"))}</span>
                        </div>
                        <div className="aa-card-field" style={{ gridColumn: "1 / -1" }}>
                          <span className="aa-card-field-label">Category</span>
                          <CatBadge value={category} />
                        </div>
                      </div>

                      {/* Footer actions */}
                      <div className="aa-card-footer">
                        <button className="aa-btn-edit" type="button"
                          onClick={() => setEditItem(item)}>
                          {Ic.edit} Edit
                        </button>
                        <button className="aa-btn-del" type="button"
                          onClick={() => handleDelete(item)}>
                          {Ic.trash} Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION FOOTER ── */}
          {!loading && filtered.length > 0 && (
            <div className="aa-footer">
              <div className="aa-footer-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> assets
              </div>
              <div className="aa-pages">
                <button className="aa-page-btn" type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0} aria-label="Previous">
                  {Ic.prev}
                </button>

                {pageNums.map((p, i) =>
                  p === "…"
                    ? <button key={`el-${i}`} className="aa-page-btn" disabled type="button">…</button>
                    : <button key={p}
                        className={`aa-page-btn ${safePage === p ? "active" : ""}`}
                        onClick={() => setPage(p)} type="button">
                        {p + 1}
                      </button>
                )}

                <button className="aa-page-btn" type="button"
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
      {toast && <div className="aa-toast">{toast}</div>}
    </div>
  );
}