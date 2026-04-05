import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./adminLogin.css";

/* ════════════════════════════════════════════════════════════
   AdminLoginHistory.jsx
   Parse class: AdminLoginHistory
   Server-side pagination (100 per page), fast count()
   Fields auto-detected from whatever Parse stores.
   Expected fields (use whatever your Parse class has):
     adminId, adminName, adminUsername, adminGender,
     device, deviceType, os, browser, ipAddress,
     country, city, region, latitude, longitude,
     loginAt (or createdAt), status
════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 100;
const CLASS_NAME = "AdminLoginHistory";

/* ─── Helpers ─── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}
function copyText(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Copied: " + text, "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      showToast("Copied!", "copy");
    });
}

/* ─── Device type icon ─── */
function deviceIcon(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("mobile") || t.includes("phone")) return "📱";
  if (t.includes("tablet"))  return "📟";
  if (t.includes("desktop")) return "🖥";
  return "💻";
}

/* ─── Status badge style ─── */
function statusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "success" || s === "ok") return { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "#34d399", label: "✓ Success" };
  if (s === "failed"  || s === "fail") return { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", text: "#f87171", label: "✕ Failed" };
  return { bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.35)", text: "#818cf8", label: status || "Unknown" };
}

/* ─── Gender style ─── */
function genderStyle(g) {
  const v = (g || "").toLowerCase();
  if (v === "male")   return { color: "#4f9cf9", icon: "♂" };
  if (v === "female") return { color: "#f472b6", icon: "♀" };
  return { color: "#94a3b8", icon: "◎" };
}

/* ─── Map a Parse object ─── */
function mapRecord(obj) {
  const av = obj.get("adminAvatar") || obj.get("avatar");
  let avatar = null;
  if (av && typeof av.url === "function") avatar = av.url();
  else if (typeof av === "string") avatar = av;

  const loginAt = obj.get("loginAt") || obj.get("createdAt") || obj.createdAt;

  return {
    id:            obj.id,
    adminId:       obj.get("adminId")        || obj.get("userId")      || "—",
    adminName:     obj.get("adminName")      || obj.get("name")        || "Unknown Admin",
    adminUsername: obj.get("adminUsername")  || obj.get("username")    || "—",
    adminGender:   obj.get("adminGender")    || obj.get("gender")      || "—",
    avatar,
    device:        obj.get("device")         || obj.get("deviceName")  || "—",
    deviceType:    obj.get("deviceType")     || "—",
    os:            obj.get("os")             || obj.get("platform")    || "—",
    browser:       obj.get("browser")        || "—",
    ipAddress:     obj.get("ipAddress")      || obj.get("ip")          || "—",
    country:       obj.get("country")        || "—",
    city:          obj.get("city")           || "—",
    region:        obj.get("region")         || "—",
    latitude:      obj.get("latitude")       || obj.get("lat")         || null,
    longitude:     obj.get("longitude")      || obj.get("lng")         || null,
    status:        obj.get("status")         || "success",
    loginAt:       loginAt ? new Date(loginAt) : null,
    createdAt:     obj.createdAt,
  };
}

/* ════════════════════════════════════════════════════════════
   DETAIL MODAL
════════════════════════════════════════════════════════════ */
function DetailModal({ record, onClose, showToast }) {
  if (!record) return null;
  const ss = statusStyle(record.status);
  const gs = genderStyle(record.adminGender);

  const fields = [
    { label: "Admin ID",   value: record.adminId,       copy: true,  mono: true  },
    { label: "Name",       value: record.adminName                               },
    { label: "Username",   value: `@${record.adminUsername}`                     },
    { label: "Gender",     value: `${gs.icon} ${record.adminGender}`,  color: gs.color },
    { label: "Device",     value: `${deviceIcon(record.deviceType)} ${record.device}` },
    { label: "Device Type",value: record.deviceType                              },
    { label: "OS",         value: record.os                                      },
    { label: "Browser",    value: record.browser                                 },
    { label: "IP Address", value: record.ipAddress,      copy: true,  mono: true },
    { label: "Country",    value: record.country                                 },
    { label: "City",       value: record.city                                    },
    { label: "Region",     value: record.region                                  },
    { label: "Coordinates",value: record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : "—", mono: true },
    { label: "Login Time", value: fmtDate(record.loginAt),             mono: true },
    { label: "Status",     value: ss.label,              color: ss.text           },
    { label: "Record ID",  value: record.id,             copy: true,  mono: true  },
  ];

  return (
    <div className="alh-overlay" onClick={onClose}>
      <div className="alh-detail-modal" onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="alh-detail-header">
          <div className="alh-detail-admin">
            {record.avatar
              ? <img src={record.avatar} alt={record.adminName} className="alh-detail-av" />
              : <div className="alh-detail-av alh-detail-av--init"
                  style={{ background: "#5ba8f5" }}>
                  {(record.adminName || "?").charAt(0).toUpperCase()}
                </div>
            }
            <div>
              <p className="alh-detail-name">{record.adminName}</p>
              <p className="alh-detail-uname">@{record.adminUsername}</p>
            </div>
          </div>
          <button className="alh-detail-close" onClick={onClose}>✕</button>
        </div>

        {/* Status + time */}
        <div className="alh-detail-meta">
          <span className="alh-status-badge"
            style={{ background: ss.bg, borderColor: ss.border, color: ss.text }}>
            {ss.label}
          </span>
          <span className="alh-detail-time">{timeAgo(record.loginAt)}</span>
        </div>

        {/* All fields */}
        <div className="alh-detail-grid">
          {fields.map((f, i) => (
            <div key={i} className="alh-detail-field">
              <span className="alh-detail-field-label">{f.label}</span>
              <span
                className={`alh-detail-field-val ${f.mono ? "mono" : ""} ${f.copy ? "copyable" : ""}`}
                style={f.color ? { color: f.color } : {}}
                onClick={f.copy ? () => copyText(f.value, showToast) : undefined}
                title={f.copy ? "Click to copy" : ""}
              >
                {f.value || "—"}
                {f.copy && <span className="alh-copy-icon">⎘</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Map link if coordinates exist */}
        {record.latitude && record.longitude && (
          <a
            className="alh-map-link"
            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📍 Open in Google Maps
          </a>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function AdminLoginHistory() {

  /* ── State ── */
  const [records,      setRecords]      = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount,  setFailedCount]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [countLoading, setCountLoading] = useState(true);
  const [animated,     setAnimated]     = useState(false);

  const [page,         setPage]         = useState(0);
  const [viewMode,     setViewMode]     = useState("list");
  const [fontSize,     setFontSize]     = useState("md");
  const [toast,        setToast]        = useState(null);

  /* filters */
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy,       setSortBy]       = useState("newest");

  /* modals */
  const [detailRecord, setDetailRecord] = useState(null);

  /* ── Toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ════════════════════════════════════════════════════════
     FETCH PAGE — server-side, 100 records per page
  ════════════════════════════════════════════════════════ */
  const fetchPage = useCallback(async (pageNum, status, srch, sort) => {
    setLoading(true);
    setAnimated(false);
    try {
      const q = new Parse.Query(CLASS_NAME);

      /* status filter */
      if (status === "success") q.equalTo("status", "success");
      if (status === "failed")  q.equalTo("status", "failed");

      /* search — try multiple fields */
      if (srch.trim()) {
        const s = srch.trim();
        const Cls = Parse.Object.extend(CLASS_NAME);
        const qN  = new Parse.Query(Cls); qN.contains("adminName",     s);
        const qU  = new Parse.Query(Cls); qU.contains("adminUsername", s);
        const qC  = new Parse.Query(Cls); qC.contains("country",       s);
        const qI  = new Parse.Query(Cls); qI.contains("ipAddress",     s);
        const qD  = new Parse.Query(Cls); qD.contains("device",        s);
        let combined = Parse.Query.or(qN, qU, qC, qI, qD);
        if (status === "success") combined.equalTo("status", "success");
        if (status === "failed")  combined.equalTo("status", "failed");
        combined.limit(PAGE_SIZE);
        combined.skip(pageNum * PAGE_SIZE);
        if (sort === "newest") combined.descending("createdAt");
        if (sort === "oldest") combined.ascending("createdAt");
        const results = await combined.find({ useMasterKey: true });
        setRecords(results.map(mapRecord));
        return;
      }

      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      if (sort === "newest") q.descending("createdAt");
      if (sort === "oldest") q.ascending("createdAt");

      const results = await q.find({ useMasterKey: true });
      setRecords(results.map(mapRecord));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  /* ════════════════════════════════════════════════════════
     FETCH COUNTS — lightweight integers only
  ════════════════════════════════════════════════════════ */
  const fetchCounts = useCallback(async (status, srch) => {
    setCountLoading(true);
    try {
      const Cls = Parse.Object.extend(CLASS_NAME);

      /* filtered total */
      const qF = new Parse.Query(Cls);
      if (status === "success") qF.equalTo("status", "success");
      if (status === "failed")  qF.equalTo("status", "failed");
      const total = await qF.count({ useMasterKey: true });
      setTotalCount(total);

      /* success + failed stats */
      const qS = new Parse.Query(Cls); qS.equalTo("status", "success");
      const qX = new Parse.Query(Cls); qX.equalTo("status", "failed");
      const [sc, fc] = await Promise.all([
        qS.count({ useMasterKey: true }),
        qX.count({ useMasterKey: true }),
      ]);
      setSuccessCount(sc);
      setFailedCount(fc);
    } catch (err) {
      console.error("Count error:", err);
    } finally {
      setCountLoading(false);
    }
  }, []);

  /* ── Trigger on filter/page change ── */
  useEffect(() => {
    fetchPage(page, statusFilter, search, sortBy);
  }, [fetchPage, page, statusFilter, search, sortBy]);

  useEffect(() => {
    fetchCounts(statusFilter, search);
  }, [fetchCounts, statusFilter, search]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleRefresh = () => { fetchPage(page, statusFilter, search, sortBy); fetchCounts(statusFilter, search); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className={`alh-root alh-fs--${fontSize}`}>

      {/* Toast */}
      {toast && (
        <div className={`alh-toast alh-toast--${toast.type}`}>
          <span className="alh-toast-dot" />{toast.msg}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        showToast={showToast}
      />

      {/* ══════════ HEADER ══════════ */}
      <div className="alh-header">
        <div className="alh-header-left">
          <p className="alh-eyebrow">Security & Access</p>
          <h1 className="alh-title">Admin Login History</h1>
          <p className="alh-sub">
            {countLoading ? "Counting…" : `${totalCount.toLocaleString()} records · ${successCount} success · ${failedCount} failed`}
          </p>
        </div>
        <div className="alh-header-right">
          {/* Font size */}
          <div className="alh-toolbar-group">
            {["sm","md","lg"].map(f => (
              <button key={f}
                className={`alh-tool-btn alh-fs-btn ${fontSize === f ? "on" : ""}`}
                onClick={() => setFontSize(f)}
                title={f === "sm" ? "Small" : f === "md" ? "Medium" : "Large"}
              >{f.toUpperCase()}</button>
            ))}
          </div>
          {/* View toggle */}
          <div className="alh-toolbar-group">
            <button className={`alh-tool-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">≡</button>
            <button className={`alh-tool-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">⊞</button>
          </div>
          <button className="alh-tool-btn alh-tool-btn--solo" onClick={handleRefresh} disabled={loading} title="Refresh">
            {loading ? <span className="alh-spin" /> : "↻"}
          </button>
        </div>
      </div>

      {/* ══════════ STAT CARDS ══════════ */}
      <div className="alh-stats">
        {[
          { label: "Total Logins", val: countLoading ? "…" : (successCount + failedCount).toLocaleString(), color: "#5ba8f5", icon: "◉" },
          { label: "Successful",   val: countLoading ? "…" : successCount.toLocaleString(), color: "#34d399", icon: "✓" },
          { label: "Failed",       val: countLoading ? "…" : failedCount.toLocaleString(),  color: "#f87171", icon: "✕" },
          { label: "Showing",      val: countLoading ? "…" : totalCount.toLocaleString(),    color: "#818cf8", icon: "◈" },
        ].map((s, i) => (
          <div key={i} className="alh-stat-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="alh-stat-icon" style={{ color: s.color, background: `${s.color}18` }}>{s.icon}</div>
            <div className="alh-stat-body">
              <span className="alh-stat-val" style={{ color: s.color }}>{s.val}</span>
              <span className="alh-stat-label">{s.label}</span>
            </div>
            <div className="alh-stat-bar" style={{ background: `${s.color}30` }} />
          </div>
        ))}
      </div>

      {/* ══════════ FILTER ROW ══════════ */}
      <div className="alh-filter-row">
        {/* Status pills */}
        <div className="alh-status-pills">
          {[
            { key: "all",     label: "All",     dot: "#818cf8" },
            { key: "success", label: "Success", dot: "#34d399" },
            { key: "failed",  label: "Failed",  dot: "#f87171" },
          ].map(p => (
            <button key={p.key}
              className={`alh-status-pill ${statusFilter === p.key ? "on" : ""}`}
              onClick={() => { setStatusFilter(p.key); setPage(0); }}>
              <span className="alh-pill-dot" style={{ background: p.dot }} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select className="alh-select" value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(0); }}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* ══════════ SEARCH ══════════ */}
      <div className="alh-search-row">
        <div className="alh-search-wrap">
          <span className="alh-search-icon">⌕</span>
          <input
            className="alh-search"
            placeholder="Search by name, username, country, IP, device…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="alh-search-x" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="alh-count">{totalCount.toLocaleString()} record{totalCount !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ══════════ CONTENT ══════════ */}
      {loading ? (
        <div className="alh-loading">
          <div className="alh-loading-ring" />
          <p>Loading login history…</p>
        </div>
      ) : records.length === 0 ? (
        <div className="alh-empty">
          <span className="alh-empty-icon">🔐</span>
          <p>No login records found</p>
          {(search || statusFilter !== "all") && (
            <button className="alh-empty-reset"
              onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter("all"); setPage(0); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`alh-cards ${animated ? "in" : ""}`}>
          {records.map((rec, i) => {
            const ss = statusStyle(rec.status);
            const gs = genderStyle(rec.adminGender);
            return (
              <div key={rec.id} className="alh-card"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => setDetailRecord(rec)}>

                {/* Status accent */}
                <div className="alh-card-accent" style={{ background: ss.text }} />

                {/* Header */}
                <div className="alh-card-head">
                  {rec.avatar
                    ? <img src={rec.avatar} alt={rec.adminName} className="alh-card-av" />
                    : <div className="alh-card-av alh-card-av--init" style={{ background: "#5ba8f5" }}>
                        {(rec.adminName || "?").charAt(0).toUpperCase()}
                      </div>
                  }
                  <div className="alh-card-admin-info">
                    <span className="alh-card-name">{rec.adminName}</span>
                    <span className="alh-card-uname">@{rec.adminUsername}</span>
                  </div>
                  <span className="alh-status-badge"
                    style={{ background: ss.bg, borderColor: ss.border, color: ss.text }}>
                    {ss.label}
                  </span>
                </div>

                {/* Details grid */}
                <div className="alh-card-fields">
                  <div className="alh-card-field">
                    <span className="alh-cf-label">Device</span>
                    <span className="alh-cf-val">{deviceIcon(rec.deviceType)} {rec.device}</span>
                  </div>
                  <div className="alh-card-field">
                    <span className="alh-cf-label">Gender</span>
                    <span className="alh-cf-val" style={{ color: gs.color }}>{gs.icon} {rec.adminGender}</span>
                  </div>
                  <div className="alh-card-field">
                    <span className="alh-cf-label">Country</span>
                    <span className="alh-cf-val">{rec.country}</span>
                  </div>
                  <div className="alh-card-field">
                    <span className="alh-cf-label">City</span>
                    <span className="alh-cf-val">{rec.city}</span>
                  </div>
                  <div className="alh-card-field">
                    <span className="alh-cf-label">OS</span>
                    <span className="alh-cf-val">{rec.os}</span>
                  </div>
                  <div className="alh-card-field">
                    <span className="alh-cf-label">IP</span>
                    <span className="alh-cf-val mono">{rec.ipAddress}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="alh-card-footer">
                  <span className="alh-card-time">{timeAgo(rec.loginAt)}</span>
                  <span className="alh-card-view-btn">View Details →</span>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`alh-list ${animated ? "in" : ""}`}>
          {/* List header */}
          <div className="alh-list-head">
            <span className="alh-lh" style={{ width: 44 }} />
            <span className="alh-lh alh-lh--grow">Admin</span>
            <span className="alh-lh alh-lh--md">Device</span>
            <span className="alh-lh alh-lh--md">Location</span>
            <span className="alh-lh alh-lh--lg">IP Address</span>
            <span className="alh-lh alh-lh--md">Gender</span>
            <span className="alh-lh">Status</span>
            <span className="alh-lh alh-lh--lg" style={{ textAlign: "right" }}>Time</span>
          </div>

          {records.map((rec, i) => {
            const ss = statusStyle(rec.status);
            const gs = genderStyle(rec.adminGender);
            return (
              <div key={rec.id} className="alh-row"
                style={{ animationDelay: `${i * 22}ms` }}
                onClick={() => setDetailRecord(rec)}>

                {/* Avatar */}
                <div className="alh-td" style={{ width: 44 }}>
                  {rec.avatar
                    ? <img src={rec.avatar} alt={rec.adminName} className="alh-row-av" />
                    : <div className="alh-row-av alh-row-av--init" style={{ background: "#5ba8f5" }}>
                        {(rec.adminName || "?").charAt(0).toUpperCase()}
                      </div>
                  }
                </div>

                {/* Name */}
                <div className="alh-td alh-td--grow alh-td--col">
                  <span className="alh-row-name">{rec.adminName}</span>
                  <span className="alh-row-uname">@{rec.adminUsername}</span>
                </div>

                {/* Device */}
                <div className="alh-td alh-td--md">
                  <span className="alh-row-device">{deviceIcon(rec.deviceType)} {rec.device !== "—" ? rec.device : rec.os}</span>
                </div>

                {/* Location */}
                <div className="alh-td alh-td--md alh-td--col">
                  <span className="alh-row-country">{rec.country}</span>
                  <span className="alh-row-city">{rec.city !== "—" ? rec.city : rec.region}</span>
                </div>

                {/* IP */}
                <div className="alh-td alh-td--lg"
                  onClick={e => { e.stopPropagation(); copyText(rec.ipAddress, showToast); }}>
                  <span className="alh-row-ip copyable">{rec.ipAddress}<span className="alh-copy-icon">⎘</span></span>
                </div>

                {/* Gender */}
                <div className="alh-td alh-td--md">
                  <span style={{ color: gs.color, fontSize: 12, fontWeight: 600 }}>{gs.icon} {rec.adminGender}</span>
                </div>

                {/* Status */}
                <div className="alh-td">
                  <span className="alh-status-badge"
                    style={{ background: ss.bg, borderColor: ss.border, color: ss.text }}>
                    {ss.label}
                  </span>
                </div>

                {/* Time */}
                <div className="alh-td alh-td--lg" style={{ justifyContent: "flex-end" }}>
                  <span className="alh-row-time">{timeAgo(rec.loginAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ PAGINATION ══════════ */}
      {totalPages > 1 && (
        <div className="alh-pages">
          <button className="alh-page alh-page--nav" disabled={page===0} onClick={() => changePage(0)}>«</button>
          <button className="alh-page alh-page--nav" disabled={page===0} onClick={() => changePage(page-1)}>‹</button>
          {pageRange[0]>0 && <><button className="alh-page" onClick={() => changePage(0)}>1</button>{pageRange[0]>1 && <span className="alh-dots">…</span>}</>}
          {pageRange.map(i => <button key={i} className={`alh-page ${page===i?"alh-page--on":""}`} onClick={() => changePage(i)}>{i+1}</button>)}
          {pageRange[pageRange.length-1]<totalPages-1 && <>{pageRange[pageRange.length-1]<totalPages-2 && <span className="alh-dots">…</span>}<button className="alh-page" onClick={() => changePage(totalPages-1)}>{totalPages}</button></>}
          <button className="alh-page alh-page--nav" disabled={page===totalPages-1} onClick={() => changePage(page+1)}>›</button>
          <button className="alh-page alh-page--nav" disabled={page===totalPages-1} onClick={() => changePage(totalPages-1)}>»</button>
          <span className="alh-page-info">Page {page+1} / {totalPages} · {totalCount.toLocaleString()} total</span>
        </div>
      )}

    </div>
  );
}