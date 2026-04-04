import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AllAgencyHistory.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight, faTableList, faBorderAll,
  faCoins, faClock, faFilter, faVideo,
  faMicrophone, faMusic, faGamepad, faStar,
} from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 25;

/* ── helpers ── */
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text).then(() => {
    showToast(`Copied!`, "copy");
  }).catch(() => {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand("copy");
    document.body.removeChild(el);
    showToast(`Copied!`, "copy");
  });
}
function fmtNum(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  if (num === 0) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}
function fmtDur(mins) {
  if (!mins && mins !== 0) return "—";
  const m = Number(mins);
  if (isNaN(m)) return "—";
  if (m === 0) return "0m";
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}
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
  return `${Math.floor(h / 24)}d ago`;
}

/* ── type config ── */
const TYPE_CONFIG = {
  livestreaming: { label: "Livestream",  color: "#5b8af5", icon: faVideo      },
  audio:         { label: "Audio",       color: "#34d399", icon: faMicrophone  },
  party:         { label: "Party",       color: "#f472b6", icon: faMusic       },
  game:          { label: "Game",        color: "#fbbf24", icon: faGamepad     },
  match:         { label: "Match",       color: "#a78bfa", icon: faStar        },
};
function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { label: type || "Unknown", color: "#6b7a9e", icon: faFilter };
}

/* ── build server-side query ── */
function buildQuery(AgencyHistory, typeFilter, srch) {
  const trim = (srch || "").trim();
  if (trim) {
    const queries = [];
    const qHost    = new Parse.Query(AgencyHistory); qHost.contains("host_id",    trim); queries.push(qHost);
    const qAgency  = new Parse.Query(AgencyHistory); qAgency.contains("agency_id", trim); queries.push(qAgency);
    const qAdmin   = new Parse.Query(AgencyHistory); qAdmin.contains("admin_id",   trim); queries.push(qAdmin);
    const combined = Parse.Query.or(...queries);
    if (typeFilter !== "all") combined.equalTo("type", typeFilter);
    return combined;
  }
  const q = new Parse.Query(AgencyHistory);
  if (typeFilter !== "all") q.equalTo("type", typeFilter);
  return q;
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AgencyHistory() {
  const [records,      setRecords]      = useState([]);
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(0);
  const [totalCount,   setTotalCount]   = useState(0);
  const [viewMode,     setViewMode]     = useState("list");
  const [toast,        setToast]        = useState(null);
  const [animated,     setAnimated]     = useState(false);
  const [statCounts,   setStatCounts]   = useState({ total: 0 });

  /* toast */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── stat count ── */
  const fetchStatCount = useCallback(async () => {
    try {
      const AgencyHistory = Parse.Object.extend("AgencyHistory");
      const q = new Parse.Query(AgencyHistory);
      const total = await q.count({ useMasterKey: true });
      setStatCounts({ total });
    } catch (err) { console.error(err); }
  }, []);

  /* ── fetch page ── */
  const fetchPage = useCallback(async (pageNum, typeF, srch) => {
    setLoading(true);
    setAnimated(false);
    try {
      const AgencyHistory = Parse.Object.extend("AgencyHistory");
      const mk = { useMasterKey: true };

      const q      = buildQuery(AgencyHistory, typeF, srch);
      const countQ = buildQuery(AgencyHistory, typeF, srch);

      q.descending("datetime");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select([
        "objectId", "datetime", "host_id", "agency_id",
        "admin_id", "type", "duration", "earning", "bonus",
        "createdAt", "updatedAt",
      ]);

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);

      setTotalCount(count);
      setRecords(batch.map(r => ({
        objectId:  r.id,
        datetime:  r.get("datetime"),
        host_id:   r.get("host_id")   || "—",
        agency_id: r.get("agency_id") || "—",
        admin_id:  r.get("admin_id")  || "—",
        type:      r.get("type")      || "—",
        duration:  r.get("duration")  ?? 0,
        earning:   r.get("earning")   ?? 0,
        bonus:     r.get("bonus")     ?? 0,
        createdAt: r.get("createdAt"),
        updatedAt: r.get("updatedAt"),
      })));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPage(page, typeFilter, search);
  }, [page, typeFilter, search, fetchPage]);

  useEffect(() => { fetchStatCount(); }, [fetchStatCount]);

  /* ── pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const changeType = t => { setTypeFilter(t); setPage(0); };
  const refresh    = () => { fetchPage(page, typeFilter, search); fetchStatCount(); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="ah-root">

      {/* Toast */}
      {toast && (
        <div className={`ah-toast ah-toast--${toast.type}`}>
          <span className="ah-toast-dot" />
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="ah-header">
        <div className="ah-header-left">
          <span className="ah-eyebrow">Agency Management</span>
          <h1 className="ah-title">Agency History</h1>
          <span className="ah-subtitle">
            {`${statCounts.total.toLocaleString()} total records · showing ${records.length} of ${totalCount}`}
          </span>
        </div>
        <div className="ah-header-right">
          <div className="ah-view-toggle">
            <button className={`ah-toggle-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">
              <FontAwesomeIcon icon={faTableList} />
            </button>
            <button className={`ah-toggle-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">
              <FontAwesomeIcon icon={faBorderAll} />
            </button>
          </div>
          <button className="ah-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? <span className="ah-spin" /> : <FontAwesomeIcon icon={faRotateRight} />}
          </button>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="ah-stat-row">
        {[
          { label: "Total Records", val: statCounts.total.toLocaleString(), color: "#818cf8" },
          { label: "This Filter",   val: totalCount.toLocaleString(),       color: "#34d399" },
          { label: "This Page",     val: records.length,                    color: "#60a5fa" },
          { label: "Pages",         val: `${page + 1} / ${totalPages || 1}`,color: "#fbbf24" },
        ].map((s, i) => (
          <div key={i} className="ah-stat-card" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="ah-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="ah-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Type filter pills ── */}
      <div className="ah-type-pills">
        <button className={`ah-type-pill ${typeFilter === "all" ? "on" : ""}`}
          onClick={() => changeType("all")}>
          <span className="ah-type-dot" style={{ background: "#6b7a9e" }} />
          All Types
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button key={key}
            className={`ah-type-pill ${typeFilter === key ? "on" : ""}`}
            style={typeFilter === key ? { borderColor: cfg.color, background: `${cfg.color}14`, color: cfg.color } : {}}
            onClick={() => changeType(key)}>
            <span className="ah-type-dot" style={{ background: cfg.color }} />
            <FontAwesomeIcon icon={cfg.icon} />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* ── Search + toolbar ── */}
      <div className="ah-toolbar">
        <div className="ah-search-wrap">
          <span className="ah-search-icon">⌕</span>
          <input className="ah-search"
            placeholder="Search by host ID, agency ID or admin ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="ah-search-clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <span className="ah-result-count">
          {!loading && `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Page indicator ── */}
      {!loading && totalPages > 1 && (
        <div className="ah-page-indicator">
          <span>Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></span>
          <span className="ah-pi-dot" />
          <span>Records <strong>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong></span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="ah-loading">
          <div className="ah-loading-ring" />
          <div className="ah-loading-ring ah-loading-ring--2" />
          <p>Fetching history…</p>
        </div>
      ) : records.length === 0 ? (
        <div className="ah-empty">
          <div className="ah-empty-icon">◎</div>
          <p>No records found</p>
          <button className="ah-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setTypeFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`ah-card-grid ${animated ? "in" : ""}`}>
          {records.map((r, i) => {
            const tc = getTypeConfig(r.type);
            return (
              <div key={r.objectId} className="ah-card"
                style={{ animationDelay: `${i * 35}ms`, "--tc": tc.color }}>

                {/* Type badge */}
                <div className="ah-card-head">
                  <span className="ah-card-type-badge"
                    style={{ background: `${tc.color}18`, borderColor: `${tc.color}44`, color: tc.color }}>
                    <FontAwesomeIcon icon={tc.icon} /> {tc.label}
                  </span>
                  <span className="ah-card-time">{timeAgo(r.datetime || r.createdAt)}</span>
                </div>

                {/* Object ID */}
                <div className="ah-card-oid ah-copyable"
                  onClick={() => copyToClipboard(r.objectId, showToast)}
                  title="Copy Object ID">
                  <span className="ah-oid-label">ID</span>
                  <span className="ah-oid-val">{r.objectId}</span>
                </div>

                {/* Earn / Bonus / Duration */}
                <div className="ah-card-kpis">
                  <div className="ah-card-kpi">
                    <span className="ah-kpi-label"><FontAwesomeIcon icon={faCoins} /> Earning</span>
                    <span className="ah-kpi-val ah-kpi-val--earn">{fmtNum(r.earning)}</span>
                  </div>
                  <div className="ah-card-kpi">
                    <span className="ah-kpi-label"><FontAwesomeIcon icon={faStar} /> Bonus</span>
                    <span className="ah-kpi-val ah-kpi-val--bonus">{fmtNum(r.bonus)}</span>
                  </div>
                  <div className="ah-card-kpi">
                    <span className="ah-kpi-label"><FontAwesomeIcon icon={faClock} /> Duration</span>
                    <span className="ah-kpi-val ah-kpi-val--dur">{fmtDur(r.duration)}</span>
                  </div>
                </div>

                {/* IDs */}
                <div className="ah-card-ids">
                  {[
                    { label: "Host",   val: r.host_id   },
                    { label: "Agency", val: r.agency_id },
                    { label: "Admin",  val: r.admin_id  },
                  ].map(id => (
                    <div key={id.label} className="ah-id-row ah-copyable"
                      onClick={() => copyToClipboard(id.val, showToast)}
                      title={`Copy ${id.label} ID`}>
                      <span className="ah-id-label">{id.label}</span>
                      <span className="ah-id-val">{id.val}</span>
                    </div>
                  ))}
                </div>

                {/* Datetime */}
                <div className="ah-card-date">
                  <FontAwesomeIcon icon={faClock} />
                  {fmtDate(r.datetime || r.createdAt)}
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`ah-list-wrap ${animated ? "in" : ""}`}>
          <div className="ah-list-head">
            <span className="ah-lh">Object ID</span>
            <span className="ah-lh">Type</span>
            <span className="ah-lh">Earning</span>
            <span className="ah-lh">Bonus</span>
            <span className="ah-lh">Duration</span>
            <span className="ah-lh">Host ID</span>
            <span className="ah-lh">Agency ID</span>
            <span className="ah-lh">Admin ID</span>
            <span className="ah-lh">Datetime</span>
          </div>

          {records.map((r, i) => {
            const tc = getTypeConfig(r.type);
            return (
              <div key={r.objectId} className="ah-row"
                style={{ animationDelay: `${i * 22}ms` }}>

                {/* Object ID */}
                <div className="ah-cell ah-cell--id ah-copyable"
                  onClick={() => copyToClipboard(r.objectId, showToast)}
                  title="Copy">
                  {r.objectId}
                </div>

                {/* Type */}
                <div className="ah-cell">
                  <span className="ah-type-badge"
                    style={{ background: `${tc.color}18`, borderColor: `${tc.color}44`, color: tc.color }}>
                    <FontAwesomeIcon icon={tc.icon} /> {tc.label}
                  </span>
                </div>

                {/* Earning */}
                <div className="ah-cell ah-cell--earn">{fmtNum(r.earning)}</div>

                {/* Bonus */}
                <div className="ah-cell ah-cell--bonus">{fmtNum(r.bonus)}</div>

                {/* Duration */}
                <div className="ah-cell ah-cell--dur">{fmtDur(r.duration)}</div>

                {/* Host ID */}
                <div className="ah-cell ah-cell--idval ah-copyable"
                  onClick={() => copyToClipboard(r.host_id, showToast)}
                  title="Copy Host ID">
                  {r.host_id}
                </div>

                {/* Agency ID */}
                <div className="ah-cell ah-cell--idval ah-copyable"
                  onClick={() => copyToClipboard(r.agency_id, showToast)}
                  title="Copy Agency ID">
                  {r.agency_id}
                </div>

                {/* Admin ID */}
                <div className="ah-cell ah-cell--idval ah-copyable"
                  onClick={() => copyToClipboard(r.admin_id, showToast)}
                  title="Copy Admin ID">
                  {r.admin_id}
                </div>

                {/* Datetime */}
                <div className="ah-cell ah-cell--time">
                  {fmtDate(r.datetime || r.createdAt)}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="ah-pagination">
          <button className="ah-page-btn ah-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(0)}>«</button>
          <button className="ah-page-btn ah-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <><button className="ah-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="ah-page-ellipsis">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`ah-page-btn ${page === i ? "on" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 &&
              <span className="ah-page-ellipsis">…</span>}
            <button className="ah-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="ah-page-btn ah-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="ah-page-btn ah-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(totalPages - 1)}>»</button>
          <span className="ah-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}