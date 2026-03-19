// AllAvatarFrames.jsx
import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./AllAvatarFrames.css";

/* ─────────────────────────────────────────
   ICONS  (inline SVG — zero deps)
───────────────────────────────────────── */
const IC = {
  frame: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
      <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  search: (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
      <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  x: (
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

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const GRADS = [
  "linear-gradient(135deg,#f43f5e,#fb923c)",
  "linear-gradient(135deg,#a78bfa,#8b5cf6)",
  "linear-gradient(135deg,#2dd4bf,#0891b2)",
  "linear-gradient(135deg,#fbbf24,#f59e0b)",
  "linear-gradient(135deg,#60a5fa,#3b82f6)",
  "linear-gradient(135deg,#fb923c,#f97316)",
  "linear-gradient(135deg,#34d399,#059669)",
  "linear-gradient(135deg,#f472b6,#ec4899)",
  "linear-gradient(135deg,#818cf8,#6366f1)",
];

function avatarGrad(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h += str.charCodeAt(i);
  return GRADS[h % GRADS.length];
}

function catClass(cat) {
  let h = 0;
  for (let i = 0; i < (cat || "").length; i++) h += cat.charCodeAt(i);
  return "af-cat-" + (h % 9);
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(function(w) { return w[0] || ""; }).slice(0, 2).join("").toUpperCase();
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtCredits(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}

/* ─────────────────────────────────────────
   FIELD GETTERS  (handle multiple field names)
───────────────────────────────────────── */
function gName(r)     { return r.get("name")     || r.get("assetName")   || r.get("title")    || "—"; }
function gCat(r)      { return r.get("category") || r.get("type")        || "—"; }
function gCredits(r)  { return r.get("credits")  ?? r.get("price")       ?? r.get("coins")    ?? null; }
function gPrivate(r)  { return !!(r.get("isPrivate") || r.get("private") || r.get("isHidden")); }

/* ─────────────────────────────────────────
   EXPORT UTILITIES
───────────────────────────────────────── */
function buildRows(items) {
  return items.map(function(r) {
    return {
      ObjectId: r.id,
      Date:     fmtDate(r.get("createdAt")),
      Name:     gName(r),
      Category: gCat(r),
      Credits:  String(gCredits(r) !== null ? gCredits(r) : "—"),
      Private:  gPrivate(r) ? "Yes" : "No",
    };
  });
}

function doCSV(items) {
  var cols = ["ObjectId","Date","Name","Category","Credits","Private"];
  var rows = buildRows(items).map(function(r) {
    return cols.map(function(c) { return '"' + String(r[c]).replace(/"/g, '""') + '"'; }).join(",");
  });
  var blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "avatar_frames.csv";
  a.click();
}

function doExcel(tableEl) {
  if (!tableEl) return;
  var uri = "data:application/vnd.ms-excel," + encodeURIComponent(tableEl.outerHTML);
  var a = document.createElement("a");
  a.href = uri;
  a.download = "avatar_frames.xls";
  a.click();
}

function doPDF(items) {
  var cols = ["ObjectId","Date","Name","Category","Credits","Private"];
  var data = buildRows(items);
  var ths  = cols.map(function(c) { return "<th>" + c + "</th>"; }).join("");
  var trs  = data.map(function(r) {
    return "<tr>" + cols.map(function(c) { return "<td>" + r[c] + "</td>"; }).join("") + "</tr>";
  }).join("");
  var html = [
    "<html><head><style>",
    "body{font-family:sans-serif;font-size:10px;color:#1e293b}",
    "h2{font-size:14px;margin-bottom:6px;color:#0f172a}",
    "p{font-size:9px;color:#64748b;margin-bottom:12px}",
    "table{width:100%;border-collapse:collapse}",
    "th{background:#0e0b0f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:.06em;text-transform:uppercase}",
    "td{padding:7px 10px;border-bottom:1px solid #e2e8f0;color:#1e293b}",
    "tr:nth-child(even) td{background:#fdf2f8}",
    "</style></head><body>",
    "<h2>Avatar Frames Export</h2>",
    "<p>Generated " + new Date().toLocaleString() + " &middot; " + items.length + " records</p>",
    "<table><thead><tr>" + ths + "</tr></thead><tbody>" + trs + "</tbody></table>",
    "</body></html>",
  ].join("");
  var w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

function doCopy(items) {
  var cols = ["ObjectId","Date","Name","Category","Credits","Private"];
  var rows = buildRows(items).map(function(r) {
    return cols.map(function(c) { return r[c]; }).join("\t");
  });
  var text = cols.join("\t") + "\n" + rows.join("\n");
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(function() { fallbackCopy(text); });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/* ─────────────────────────────────────────
   PRIVATE TOGGLE  (inline row toggle)
───────────────────────────────────────── */
function PrivateToggle({ checked, onChange, disabled }) {
  return (
    <div className="af-toggle-wrap">
      <label className="af-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <div className="af-track">
          <div className="af-thumb" />
        </div>
      </label>
      <span className={"af-toggle-lbl " + (checked ? "on" : "off")}>
        {checked ? "Yes" : "No"}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   CATEGORY BADGE
───────────────────────────────────────── */
function CatBadge({ value }) {
  return (
    <span className={"af-cat " + catClass(value)}>
      <span className="af-cat-dot" />
      {value || "—"}
    </span>
  );
}

/* ─────────────────────────────────────────
   EDIT MODAL
───────────────────────────────────────── */
function EditModal({ item, categories, onClose, onSaved, showToast }) {
  var [name,     setName]     = useState(gName(item));
  var [category, setCategory] = useState(gCat(item) === "—" ? "" : gCat(item));
  var [credits,  setCredits]  = useState(
    gCredits(item) !== null ? String(gCredits(item)) : ""
  );
  var [isPrivate, setIsPrivate] = useState(gPrivate(item));
  var [saving,   setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      if (item.get("name")      !== undefined) item.set("name",      name);
      if (item.get("assetName") !== undefined) item.set("assetName", name);
      if (item.get("title")     !== undefined) item.set("title",     name);
      if (item.get("category")  !== undefined) item.set("category",  category);
      if (item.get("type")      !== undefined) item.set("type",      category);
      var c = parseFloat(credits);
      if (!isNaN(c)) {
        if (item.get("credits") !== undefined) item.set("credits", c);
        if (item.get("price")   !== undefined) item.set("price",   c);
        if (item.get("coins")   !== undefined) item.set("coins",   c);
      }
      if (item.get("isPrivate") !== undefined) item.set("isPrivate", isPrivate);
      if (item.get("private")   !== undefined) item.set("private",   isPrivate);
      if (item.get("isHidden")  !== undefined) item.set("isHidden",  isPrivate);
      await item.save();
      showToast("✓ Avatar frame updated");
      onSaved(item);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      showToast("✗ Failed to save — check console");
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="af-overlay" onClick={handleOverlayClick}>
      <div className="af-modal">
        <div className="af-modal-hdr">
          <div className="af-modal-title">{IC.edit} Edit Avatar Frame</div>
          <button className="af-modal-x" onClick={onClose} type="button">{IC.x}</button>
        </div>

        {/* Object ID — read-only */}
        <div className="af-mfield">
          <label className="af-mlabel">Object ID</label>
          <input
            className="af-minput"
            value={item.id}
            readOnly
            style={{ opacity: .45, cursor: "not-allowed", fontFamily: "var(--mono)", fontSize: ".74rem" }}
          />
        </div>

        {/* Name */}
        <div className="af-mfield">
          <label className="af-mlabel">Name</label>
          <input
            className="af-minput"
            value={name}
            onChange={function(e) { setName(e.target.value); }}
            placeholder="Frame name"
          />
        </div>

        {/* Category */}
        <div className="af-mfield">
          <label className="af-mlabel">Category</label>
          {categories.length > 1 ? (
            <select
              className="af-mselect"
              value={category}
              onChange={function(e) { setCategory(e.target.value); }}
            >
              <option value="">Select category…</option>
              {categories.filter(Boolean).map(function(c) {
                return <option key={c} value={c}>{c}</option>;
              })}
            </select>
          ) : (
            <input
              className="af-minput"
              value={category}
              onChange={function(e) { setCategory(e.target.value); }}
              placeholder="e.g. avatar_frame, special…"
            />
          )}
        </div>

        {/* Credits */}
        <div className="af-mfield">
          <label className="af-mlabel">Credits</label>
          <input
            className="af-minput"
            type="number"
            min="0"
            step="any"
            value={credits}
            onChange={function(e) { setCredits(e.target.value); }}
            placeholder="0"
          />
        </div>

        {/* Private toggle */}
        <div className="af-mfield">
          <label className="af-mlabel">Private Access</label>
          <div
            className={"af-private-row" + (isPrivate ? " prv-on" : "")}
            onClick={function() { setIsPrivate(function(v) { return !v; }); }}
            role="button"
            tabIndex={0}
            onKeyDown={function(e) { if (e.key === "Enter") setIsPrivate(function(v) { return !v; }); }}
          >
            <span className="af-private-label">
              {isPrivate ? "🔒 Private — Restricted access" : "🌐 Public — Available to all"}
            </span>
            <div className={"af-big-toggle" + (isPrivate ? " on" : "")}>
              <div className="af-big-toggle-thumb" />
            </div>
          </div>
        </div>

        <div className="af-modal-ftr">
          <button className="af-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="af-save" onClick={handleSave} disabled={saving} type="button">
            {IC.save} {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AllAvatarFrames() {
  var [rows,       setRows]       = useState([]);
  var [loading,    setLoading]    = useState(true);
  var [toggling,   setToggling]   = useState({});
  var [search,     setSearch]     = useState("");
  var [catFilter,  setCatFilter]  = useState("All");
  var [prvFilter,  setPrvFilter]  = useState(false);
  var [page,       setPage]       = useState(0);
  var [perPage,    setPerPage]    = useState(10);
  var [editItem,   setEditItem]   = useState(null);
  var [toast,      setToast]      = useState("");
  var tableRef = useRef(null);

  /* ── Fetch ── */
  var fetchData = useCallback(async function() {
    setLoading(true);
    try {
      var q = new Parse.Query(Parse.Object.extend("AvatarFrames"));
      q.descending("createdAt");
      q.limit(2000);
      var results = await q.find();
      setRows(results);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(function() { fetchData(); }, [fetchData]);
  useEffect(function() { setPage(0); }, [search, catFilter, prvFilter, perPage]);

  /* ── Toast ── */
  var showToast = useCallback(function(msg) {
    setToast(msg);
    setTimeout(function() { setToast(""); }, 2500);
  }, []);

  /* ── Toggle private inline ── */
  var handleToggle = useCallback(async function(item) {
    var id      = item.id;
    var current = gPrivate(item);
    setToggling(function(prev) { return Object.assign({}, prev, { [id]: true }); });
    try {
      var next = !current;
      if (item.get("isPrivate") !== undefined) item.set("isPrivate", next);
      if (item.get("private")   !== undefined) item.set("private",   next);
      if (item.get("isHidden")  !== undefined) item.set("isHidden",  next);
      await item.save();
      setRows(function(prev) { return prev.map(function(r) { return r.id === id ? item : r; }); });
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("✗ Toggle failed");
    } finally {
      setToggling(function(prev) { return Object.assign({}, prev, { [id]: false }); });
    }
  }, [showToast]);

  /* ── Delete ── */
  var handleDelete = useCallback(async function(item) {
    if (!window.confirm('Delete "' + gName(item) + '"?')) return;
    try {
      await item.destroy();
      setRows(function(prev) { return prev.filter(function(r) { return r.id !== item.id; }); });
      showToast("✓ Avatar frame deleted");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("✗ Delete failed");
    }
  }, [showToast]);

  /* ── After edit saved ── */
  var handleSaved = useCallback(function(updated) {
    setRows(function(prev) {
      return prev.map(function(r) { return r.id === updated.id ? updated : r; });
    });
  }, []);

  /* ── Categories list ── */
  var categories = useMemo(function() {
    var s = new Set(rows.map(gCat).filter(function(c) { return c && c !== "—"; }));
    return Array.from(s).sort();
  }, [rows]);

  /* ── Stats ── */
  var privateCount = useMemo(function() {
    return rows.filter(gPrivate).length;
  }, [rows]);

  var totalCredits = useMemo(function() {
    return rows.reduce(function(acc, r) { return acc + (gCredits(r) || 0); }, 0);
  }, [rows]);

  /* ── Filter ── */
  var filtered = useMemo(function() {
    var list = rows;
    if (catFilter !== "All") {
      list = list.filter(function(r) { return gCat(r) === catFilter; });
    }
    if (prvFilter) {
      list = list.filter(gPrivate);
    }
    var q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(function(r) {
      return (
        r.id.toLowerCase().includes(q) ||
        gName(r).toLowerCase().includes(q) ||
        gCat(r).toLowerCase().includes(q)
      );
    });
  }, [rows, search, catFilter, prvFilter]);

  /* ── Pagination ── */
  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  var safePage   = Math.min(page, totalPages - 1);
  var pageItems  = filtered.slice(safePage * perPage, (safePage + 1) * perPage);
  var startIdx   = filtered.length === 0 ? 0 : safePage * perPage + 1;
  var endIdx     = Math.min((safePage + 1) * perPage, filtered.length);

  /* ── Smart page numbers ── */
  var pageNums = useMemo(function() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, function(_, i) { return i; });
    var arr = [0];
    if (safePage > 2) arr.push("…");
    for (var i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) arr.push(i);
    if (safePage < totalPages - 3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="af-page">
      <div className="af-topline" />
      <div className="af-wrap">

        {/* HEADER */}
        <div className="af-header">
          <div className="af-hdr-left">
            <div className="af-logo">{IC.frame}</div>
            <div>
              <div className="af-title">All Avatar Frames</div>
              <div className="af-sub">Manage avatar frame assets &amp; access controls</div>
            </div>
          </div>
          <div className="af-chips">
            <div className="af-chip total">🖼️ {rows.length} frames</div>
            <div className="af-chip private">🔒 {privateCount} private</div>
            <div className="af-chip credits">🪙 {fmtCredits(totalCredits)}</div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="af-toolbar">
          {/* Search */}
          <div className="af-srch-wrap">
            <span className="af-srch-ico">{IC.search}</span>
            <input
              className="af-srch"
              type="text"
              placeholder="Search by ID, name or category…"
              value={search}
              onChange={function(e) { setSearch(e.target.value); }}
            />
            {search && (
              <button className="af-srch-clr" onClick={function() { setSearch(""); }} type="button">
                {IC.x}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="af-filters">
            <button
              className={"af-fbtn" + (catFilter === "All" && !prvFilter ? " act" : "")}
              onClick={function() { setCatFilter("All"); setPrvFilter(false); }}
              type="button"
            >
              All
            </button>
            <button
              className={"af-fbtn prv" + (prvFilter ? " act" : "")}
              onClick={function() { setPrvFilter(function(v) { return !v; }); setCatFilter("All"); }}
              type="button"
            >
              🔒 Private Only
            </button>
            {categories.map(function(cat) {
              return (
                <button
                  key={cat}
                  className={"af-fbtn" + (catFilter === cat ? " act" : "")}
                  onClick={function() { setCatFilter(cat); setPrvFilter(false); }}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Exports */}
          <div className="af-exports">
            <button className="af-exp copy" type="button"
              onClick={function() { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {IC.copy} <span>Copy</span>
            </button>
            <button className="af-exp csv" type="button" onClick={function() { doCSV(filtered); }}>
              {IC.csv} <span>CSV</span>
            </button>
            <button className="af-exp excel" type="button" onClick={function() { doExcel(tableRef.current); }}>
              {IC.excel} <span>Excel</span>
            </button>
            <button className="af-exp pdf" type="button" onClick={function() { doPDF(filtered); }}>
              {IC.pdf} <span>PDF</span>
            </button>
            <button className="af-exp print" type="button" onClick={function() { window.print(); }}>
              {IC.print} <span>Print</span>
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="af-summary">
          <div className="af-info">
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> frames
            {search && ' matching "' + search + '"'}
            {catFilter !== "All" && ' in "' + catFilter + '"'}
            {prvFilter && " · private only"}
          </div>
          <div className="af-ppwrap">
            <span>Rows:</span>
            <select
              className="af-ppsel"
              value={perPage}
              onChange={function(e) { setPerPage(Number(e.target.value)); }}
            >
              {[5, 10, 20, 50, 100].map(function(n) {
                return <option key={n} value={n}>{n}</option>;
              })}
            </select>
          </div>
        </div>

        {/* MAIN CARD */}
        <div className="af-card">

          {loading ? (
            <div className="af-loading">
              <div className="af-spinner" />
              Loading avatar frames…
            </div>
          ) : filtered.length === 0 ? (
            <div className="af-empty">
              <div className="af-empty-ico">🖼️</div>
              <div className="af-empty-title">
                {search || catFilter !== "All" || prvFilter ? "No results found" : "No avatar frames yet"}
              </div>
              <div className="af-empty-desc">
                {search
                  ? 'Nothing matches "' + search + '"'
                  : prvFilter
                  ? "No private frames found"
                  : catFilter !== "All"
                  ? 'No frames in "' + catFilter + '"'
                  : "Avatar frames will appear here once added."}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="af-tbl-scroll">
                <table className="af-tbl" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Credits</th>
                      <th>Private</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(function(item, idx) {
                      var nm   = gName(item);
                      var cat  = gCat(item);
                      var cred = gCredits(item);
                      var prv  = gPrivate(item);
                      return (
                        <tr key={item.id}>
                          <td><span className="af-num">{startIdx + idx}</span></td>
                          <td>
                            <span
                              className="af-oid"
                              title={"Click to copy: " + item.id}
                              onClick={function() {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(item.id);
                                }
                                showToast("✓ Object ID copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td><span className="af-date">{fmtDate(item.get("createdAt"))}</span></td>
                          <td>
                            <div className="af-name-cell">
                              <div className="af-avatar" style={{ background: avatarGrad(nm) }}>
                                {initials(nm)}
                              </div>
                              <span className="af-name-text">{nm}</span>
                            </div>
                          </td>
                          <td><CatBadge value={cat} /></td>
                          <td>
                            <span className="af-credits">
                              🪙 {fmtCredits(cred)}
                            </span>
                          </td>
                          <td>
                            <PrivateToggle
                              checked={prv}
                              onChange={function() { handleToggle(item); }}
                              disabled={!!toggling[item.id]}
                            />
                          </td>
                          <td>
                            <div className="af-actions">
                              <button className="af-btn-edit" type="button"
                                onClick={function() { setEditItem(item); }}>
                                {IC.edit} Edit
                              </button>
                              <button className="af-btn-del" type="button"
                                onClick={function() { handleDelete(item); }}>
                                {IC.trash} Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD LIST */}
              <div className="af-mob-list">
                {pageItems.map(function(item, idx) {
                  var nm   = gName(item);
                  var cat  = gCat(item);
                  var cred = gCredits(item);
                  var prv  = gPrivate(item);
                  return (
                    <div key={item.id} className={"af-mob-card" + (prv ? " is-private" : "")}>
                      {/* Top */}
                      <div className="af-mob-top">
                        <div className="af-name-cell">
                          <div
                            className="af-avatar"
                            style={{ background: avatarGrad(nm), width: 36, height: 36, fontSize: ".68rem" }}
                          >
                            {initials(nm)}
                          </div>
                          <div>
                            <div className="af-name-text" style={{ fontSize: ".88rem" }}>{nm}</div>
                            <div style={{ fontSize: ".67rem", color: "var(--t4)", marginTop: 1 }}>
                              #{startIdx + idx}
                            </div>
                          </div>
                        </div>
                        <PrivateToggle
                          checked={prv}
                          onChange={function() { handleToggle(item); }}
                          disabled={!!toggling[item.id]}
                        />
                      </div>

                      {/* Meta grid */}
                      <div className="af-mob-grid">
                        <div className="af-mob-field">
                          <span className="af-mob-lbl">Object ID</span>
                          <span
                            className="af-oid"
                            style={{ maxWidth: "100%", fontSize: ".67rem" }}
                            title={item.id}
                            onClick={function() {
                              if (navigator.clipboard) navigator.clipboard.writeText(item.id);
                              showToast("✓ Copied!");
                            }}
                          >
                            {item.id}
                          </span>
                        </div>
                        <div className="af-mob-field">
                          <span className="af-mob-lbl">Date</span>
                          <span className="af-mob-val">{fmtDate(item.get("createdAt"))}</span>
                        </div>
                        <div className="af-mob-field">
                          <span className="af-mob-lbl">Category</span>
                          <CatBadge value={cat} />
                        </div>
                        <div className="af-mob-field">
                          <span className="af-mob-lbl">Credits</span>
                          <span className="af-credits" style={{ fontSize: ".82rem" }}>
                            🪙 {fmtCredits(cred)}
                          </span>
                        </div>
                      </div>

                      {/* Footer actions */}
                      <div className="af-mob-footer">
                        <button className="af-btn-edit" type="button"
                          onClick={function() { setEditItem(item); }}>
                          {IC.edit} Edit
                        </button>
                        <button className="af-btn-del" type="button"
                          onClick={function() { handleDelete(item); }}>
                          {IC.trash} Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* PAGINATION */}
          {!loading && filtered.length > 0 && (
            <div className="af-footer">
              <div className="af-foot-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> avatar frames
              </div>
              <div className="af-pages">
                <button
                  className="af-pg" type="button"
                  onClick={function() { setPage(function(p) { return Math.max(0, p - 1); }); }}
                  disabled={safePage === 0}
                  aria-label="Previous"
                >
                  {IC.prev}
                </button>

                {pageNums.map(function(p, i) {
                  if (p === "…") {
                    return (
                      <button key={"el" + i} className="af-pg" disabled type="button">…</button>
                    );
                  }
                  return (
                    <button
                      key={p}
                      className={"af-pg" + (safePage === p ? " on" : "")}
                      onClick={function() { setPage(p); }}
                      type="button"
                    >
                      {p + 1}
                    </button>
                  );
                })}

                <button
                  className="af-pg" type="button"
                  onClick={function() { setPage(function(p) { return Math.min(totalPages - 1, p + 1); }); }}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next"
                >
                  {IC.next}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* EDIT MODAL */}
      {editItem && (
        <EditModal
          item={editItem}
          categories={categories}
          onClose={function() { setEditItem(null); }}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* TOAST */}
      {toast && <div className="af-toast">{toast}</div>}
    </div>
  );
}