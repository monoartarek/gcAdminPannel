// AllPartyThemes.jsx
import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import Parse from "../../parseConfig";
import "./AllPartyThemes.css";

/* ─────────────────────────────────────────
   ICONS  (inline SVG — zero deps)
───────────────────────────────────────── */
const IC = {
  theme: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        stroke="currentColor" strokeWidth="2"/>
      <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
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
  file: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor" strokeWidth="1.8"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  link: (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
  return "pt-cat-" + (h % 9);
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
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function getFileName(url) {
  if (!url) return null;
  try {
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1].split("?")[0]);
  } catch {
    return url;
  }
}

/* ─────────────────────────────────────────
   FIELD GETTERS
───────────────────────────────────────── */
function gName(r)     { return r.get("name")     || r.get("assetName")   || r.get("title")    || "—"; }
function gCat(r)      { return r.get("category") || r.get("type")        || "—"; }
function gCredits(r)  { return r.get("credits")  ?? r.get("price")       ?? r.get("coins")    ?? null; }
function gFile(r) {
  const f = r.get("file") || r.get("asset") || r.get("fileUrl") || r.get("url") || null;
  if (!f) return null;
  if (typeof f === "string") return f;
  if (f && typeof f.url === "function") return f.url();
  if (f && f._url) return f._url;
  return null;
}

/* ─────────────────────────────────────────
   EXPORT UTILITIES
───────────────────────────────────────── */
function buildRows(items) {
  return items.map(function(r) {
    const fileUrl = gFile(r);
    return {
      ObjectId: r.id,
      Date:     fmtDate(r.get("createdAt")),
      Name:     gName(r),
      Category: gCat(r),
      Credits:  String(gCredits(r) !== null ? gCredits(r) : "—"),
      File:     fileUrl || "—",
    };
  });
}

function doCSV(items) {
  var cols = ["ObjectId","Date","Name","Category","Credits","File"];
  var rows = buildRows(items).map(function(r) {
    return cols.map(function(c) { return '"' + String(r[c]).replace(/"/g, '""') + '"'; }).join(",");
  });
  var blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "party_themes.csv";
  a.click();
}

function doExcel(tableEl) {
  if (!tableEl) return;
  var uri = "data:application/vnd.ms-excel," + encodeURIComponent(tableEl.outerHTML);
  var a = document.createElement("a");
  a.href = uri;
  a.download = "party_themes.xls";
  a.click();
}

function doPDF(items) {
  var cols = ["ObjectId","Date","Name","Category","Credits","File"];
  var data = buildRows(items);
  var ths  = cols.map(function(c) { return "<th>" + c + "</th>"; }).join("");
  var trs  = data.map(function(r) {
    return "<tr>" + cols.map(function(c) {
      const val = r[c];
      return "<td>" + (c === "File" && val !== "—"
        ? '<a href="' + val + '" target="_blank">View File</a>'
        : val) + "</td>";
    }).join("") + "</tr>";
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
    "a{color:#7c3aed}",
    "</style></head><body>",
    "<h2>Party Themes Export</h2>",
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
  var cols = ["ObjectId","Date","Name","Category","Credits","File"];
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
   FILE BADGE
───────────────────────────────────────── */
function FileBadge({ url }) {
  if (!url) {
    return <span className="pt-file-none">No file</span>;
  }
  const name = getFileName(url);
  const ext  = name ? name.split(".").pop().toLowerCase() : "";
  const isImage = ["png","jpg","jpeg","gif","webp","svg"].includes(ext);

  return (
    <a
      className="pt-file-badge"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={name || url}
    >
      {isImage ? "🖼️" : IC.file}
      <span className="pt-file-name">{name || "View File"}</span>
      {IC.link}
    </a>
  );
}

/* ─────────────────────────────────────────
   CATEGORY BADGE
───────────────────────────────────────── */
function CatBadge({ value }) {
  return (
    <span className={"pt-cat " + catClass(value)}>
      <span className="pt-cat-dot" />
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
  var [saving, setSaving] = useState(false);

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
      await item.save();
      showToast("✓ Party theme updated");
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

  const fileUrl = gFile(item);

  return (
    <div className="pt-overlay" onClick={handleOverlayClick}>
      <div className="pt-modal">
        <div className="pt-modal-hdr">
          <div className="pt-modal-title">{IC.edit} Edit Party Theme</div>
          <button className="pt-modal-x" onClick={onClose} type="button">{IC.x}</button>
        </div>

        {/* Object ID */}
        <div className="pt-mfield">
          <label className="pt-mlabel">Object ID</label>
          <input
            className="pt-minput"
            value={item.id}
            readOnly
            style={{ opacity: .45, cursor: "not-allowed", fontFamily: "var(--pt-mono)", fontSize: ".74rem" }}
          />
        </div>

        {/* Name */}
        <div className="pt-mfield">
          <label className="pt-mlabel">Name</label>
          <input
            className="pt-minput"
            value={name}
            onChange={function(e) { setName(e.target.value); }}
            placeholder="Theme name"
          />
        </div>

        {/* Category */}
        <div className="pt-mfield">
          <label className="pt-mlabel">Category</label>
          {categories.length > 1 ? (
            <select
              className="pt-mselect"
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
              className="pt-minput"
              value={category}
              onChange={function(e) { setCategory(e.target.value); }}
              placeholder="e.g. birthday, wedding…"
            />
          )}
        </div>

        {/* Credits */}
        <div className="pt-mfield">
          <label className="pt-mlabel">Credits</label>
          <input
            className="pt-minput"
            type="number"
            min="0"
            step="any"
            value={credits}
            onChange={function(e) { setCredits(e.target.value); }}
            placeholder="0"
          />
        </div>

        {/* File — read-only preview */}
        {fileUrl && (
          <div className="pt-mfield">
            <label className="pt-mlabel">File</label>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pt-file-preview"
            >
              {IC.link} {getFileName(fileUrl) || "View File"}
            </a>
          </div>
        )}

        <div className="pt-modal-ftr">
          <button className="pt-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="pt-save" onClick={handleSave} disabled={saving} type="button">
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
export default function AllPartyThemes() {
  var [rows,      setRows]      = useState([]);
  var [loading,   setLoading]   = useState(true);
  var [search,    setSearch]    = useState("");
  var [catFilter, setCatFilter] = useState("All");
  var [page,      setPage]      = useState(0);
  var [perPage,   setPerPage]   = useState(10);
  var [editItem,  setEditItem]  = useState(null);
  var [toast,     setToast]     = useState("");
  var tableRef = useRef(null);

  /* ── Fetch ── */
  var fetchData = useCallback(async function() {
    setLoading(true);
    try {
      var q = new Parse.Query(Parse.Object.extend("PartyThemes"));
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
  useEffect(function() { setPage(0); }, [search, catFilter, perPage]);

  /* ── Toast ── */
  var showToast = useCallback(function(msg) {
    setToast(msg);
    setTimeout(function() { setToast(""); }, 2500);
  }, []);

  /* ── Delete ── */
  var handleDelete = useCallback(async function(item) {
    if (!window.confirm('Delete "' + gName(item) + '"?')) return;
    try {
      await item.destroy();
      setRows(function(prev) { return prev.filter(function(r) { return r.id !== item.id; }); });
      showToast("✓ Party theme deleted");
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
  var withFileCount = useMemo(function() {
    return rows.filter(function(r) { return !!gFile(r); }).length;
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
    var q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(function(r) {
      return (
        r.id.toLowerCase().includes(q) ||
        gName(r).toLowerCase().includes(q) ||
        gCat(r).toLowerCase().includes(q)
      );
    });
  }, [rows, search, catFilter]);

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
    <div className="pt-page">
      <div className="pt-topline" />
      <div className="pt-wrap">

        {/* HEADER */}
        <div className="pt-header">
          <div className="pt-hdr-left">
            <div className="pt-logo">{IC.theme}</div>
            <div>
              <div className="pt-title">All Party Themes</div>
              <div className="pt-sub">Manage party theme assets &amp; files</div>
            </div>
          </div>
          <div className="pt-chips">
            <div className="pt-chip total">🎉 {rows.length} themes</div>
            <div className="pt-chip files">📎 {withFileCount} with files</div>
            <div className="pt-chip credits">🪙 {fmtCredits(totalCredits)}</div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="pt-toolbar">
          {/* Search */}
          <div className="pt-srch-wrap">
            <span className="pt-srch-ico">{IC.search}</span>
            <input
              className="pt-srch"
              type="text"
              placeholder="Search by ID, name or category…"
              value={search}
              onChange={function(e) { setSearch(e.target.value); }}
            />
            {search && (
              <button className="pt-srch-clr" onClick={function() { setSearch(""); }} type="button">
                {IC.x}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="pt-filters">
            <button
              className={"pt-fbtn" + (catFilter === "All" ? " act" : "")}
              onClick={function() { setCatFilter("All"); }}
              type="button"
            >
              All
            </button>
            {categories.map(function(cat) {
              return (
                <button
                  key={cat}
                  className={"pt-fbtn" + (catFilter === cat ? " act" : "")}
                  onClick={function() { setCatFilter(cat); }}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Exports */}
          <div className="pt-exports">
            <button className="pt-exp copy" type="button"
              onClick={function() { doCopy(filtered); showToast("✓ Copied to clipboard!"); }}>
              {IC.copy} <span>Copy</span>
            </button>
            <button className="pt-exp csv" type="button" onClick={function() { doCSV(filtered); }}>
              {IC.csv} <span>CSV</span>
            </button>
            <button className="pt-exp excel" type="button" onClick={function() { doExcel(tableRef.current); }}>
              {IC.excel} <span>Excel</span>
            </button>
            <button className="pt-exp pdf" type="button" onClick={function() { doPDF(filtered); }}>
              {IC.pdf} <span>PDF</span>
            </button>
            <button className="pt-exp print" type="button" onClick={function() { window.print(); }}>
              {IC.print} <span>Print</span>
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="pt-summary">
          <div className="pt-info">
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> themes
            {search && ' matching "' + search + '"'}
            {catFilter !== "All" && ' in "' + catFilter + '"'}
          </div>
          <div className="pt-ppwrap">
            <span>Rows:</span>
            <select
              className="pt-ppsel"
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
        <div className="pt-card">

          {loading ? (
            <div className="pt-loading">
              <div className="pt-spinner" />
              Loading party themes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="pt-empty">
              <div className="pt-empty-ico">🎉</div>
              <div className="pt-empty-title">
                {search || catFilter !== "All" ? "No results found" : "No party themes yet"}
              </div>
              <div className="pt-empty-desc">
                {search
                  ? 'Nothing matches "' + search + '"'
                  : catFilter !== "All"
                  ? 'No themes in "' + catFilter + '"'
                  : "Party themes will appear here once added."}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="pt-tbl-scroll">
                <table className="pt-tbl" ref={tableRef}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Credits</th>
                      <th>File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(function(item, idx) {
                      var nm   = gName(item);
                      var cat  = gCat(item);
                      var cred = gCredits(item);
                      var fileUrl = gFile(item);
                      return (
                        <tr key={item.id}>
                          <td><span className="pt-num">{startIdx + idx}</span></td>
                          <td>
                            <span
                              className="pt-oid"
                              title={"Click to copy: " + item.id}
                              onClick={function() {
                                if (navigator.clipboard) navigator.clipboard.writeText(item.id);
                                showToast("✓ Object ID copied!");
                              }}
                            >
                              {item.id}
                            </span>
                          </td>
                          <td><span className="pt-date">{fmtDate(item.get("createdAt"))}</span></td>
                          <td>
                            <div className="pt-name-cell">
                              <div className="pt-avatar" style={{ background: avatarGrad(nm) }}>
                                {initials(nm)}
                              </div>
                              <span className="pt-name-text">{nm}</span>
                            </div>
                          </td>
                          <td><CatBadge value={cat} /></td>
                          <td>
                            <span className="pt-credits">
                              🪙 {fmtCredits(cred)}
                            </span>
                          </td>
                          <td><FileBadge url={fileUrl} /></td>
                          <td>
                            <div className="pt-actions">
                              <button className="pt-btn-edit" type="button"
                                onClick={function() { setEditItem(item); }}>
                                {IC.edit} Edit
                              </button>
                              <button className="pt-btn-del" type="button"
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
              <div className="pt-mob-list">
                {pageItems.map(function(item, idx) {
                  var nm      = gName(item);
                  var cat     = gCat(item);
                  var cred    = gCredits(item);
                  var fileUrl = gFile(item);
                  return (
                    <div key={item.id} className="pt-mob-card">
                      {/* Top */}
                      <div className="pt-mob-top">
                        <div className="pt-name-cell">
                          <div
                            className="pt-avatar"
                            style={{ background: avatarGrad(nm), width: 36, height: 36, fontSize: ".68rem" }}
                          >
                            {initials(nm)}
                          </div>
                          <div>
                            <div className="pt-name-text" style={{ fontSize: ".88rem" }}>{nm}</div>
                            <div style={{ fontSize: ".67rem", color: "var(--pt-t4)", marginTop: 1 }}>
                              #{startIdx + idx}
                            </div>
                          </div>
                        </div>
                        <CatBadge value={cat} />
                      </div>

                      {/* Meta grid */}
                      <div className="pt-mob-grid">
                        <div className="pt-mob-field">
                          <span className="pt-mob-lbl">Object ID</span>
                          <span
                            className="pt-oid"
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
                        <div className="pt-mob-field">
                          <span className="pt-mob-lbl">Date</span>
                          <span className="pt-mob-val">{fmtDate(item.get("createdAt"))}</span>
                        </div>
                        <div className="pt-mob-field">
                          <span className="pt-mob-lbl">Credits</span>
                          <span className="pt-credits" style={{ fontSize: ".82rem" }}>
                            🪙 {fmtCredits(cred)}
                          </span>
                        </div>
                        <div className="pt-mob-field">
                          <span className="pt-mob-lbl">File</span>
                          <FileBadge url={fileUrl} />
                        </div>
                      </div>

                      {/* Footer actions */}
                      <div className="pt-mob-footer">
                        <button className="pt-btn-edit" type="button"
                          onClick={function() { setEditItem(item); }}>
                          {IC.edit} Edit
                        </button>
                        <button className="pt-btn-del" type="button"
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
            <div className="pt-footer">
              <div className="pt-foot-info">
                <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> party themes
              </div>
              <div className="pt-pages">
                <button
                  className="pt-pg" type="button"
                  onClick={function() { setPage(function(p) { return Math.max(0, p - 1); }); }}
                  disabled={safePage === 0}
                  aria-label="Previous"
                >
                  {IC.prev}
                </button>

                {pageNums.map(function(p, i) {
                  if (p === "…") {
                    return <button key={"el" + i} className="pt-pg" disabled type="button">…</button>;
                  }
                  return (
                    <button
                      key={p}
                      className={"pt-pg" + (safePage === p ? " on" : "")}
                      onClick={function() { setPage(p); }}
                      type="button"
                    >
                      {p + 1}
                    </button>
                  );
                })}

                <button
                  className="pt-pg" type="button"
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
      {toast && <div className="pt-toast">{toast}</div>}
    </div>
  );
}