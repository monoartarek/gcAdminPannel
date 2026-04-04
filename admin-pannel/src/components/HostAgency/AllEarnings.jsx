import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";
import "./AllEarnings.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight, faFileExport, faFileCsv,
  faFilePdf, faFileExcel, faCopy,
  faChevronDown, faChevronUp, faCoins,
  faClock, faSearch, faSort, faSortUp, faSortDown,
} from "@fortawesome/free-solid-svg-icons";

/* ── helpers ── */
function fmtNum(n) {
  const num = Number(n);
  if (!num || isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}
function fmtNumRaw(n) {
  const num = Number(n);
  return isNaN(num) ? 0 : num;
}
function fmtDur(mins) {
  const m = Number(mins);
  if (!m || isNaN(m)) return "0m";
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}
function getInitial(str) { return (str || "?").charAt(0).toUpperCase(); }
function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand("copy");
    document.body.removeChild(el);
  });
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AllEarnings() {
  const [rows,        setRows]        = useState([]); // grouped by host_id
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [animated,    setAnimated]    = useState(false);
  const [search,      setSearch]      = useState("");
  const [expandedId,  setExpandedId]  = useState(null);
  const [sortCol,     setSortCol]     = useState("total_earning");
  const [sortDir,     setSortDir]     = useState("desc");
  const [exportOpen,  setExportOpen]  = useState(false);
  const exportRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* close export dropdown on outside click */
  useEffect(() => {
    const handler = e => {
      if (exportRef.current && !exportRef.current.contains(e.target))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── fetch AgencyHistory and group by host_id ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const AgencyHistory = Parse.Object.extend("AgencyHistory");
      let all = [], skip = 0;
      while (true) {
        const q = new Parse.Query(AgencyHistory);
        q.limit(1000); q.skip(skip);
        q.select([
          "host_id", "agent_id", "agency_id", "admin_id",
          "type", "earning", "bonus", "duration", "datetime",
        ]);
        const batch = await q.find({ useMasterKey: true });
        if (!batch.length) break;
        all = [...all, ...batch];
        if (batch.length < 1000) break;
        skip += 1000;
      }

      /* group by host_id */
      const map = {};
      all.forEach(r => {
        const hid = r.get("host_id") || "Unknown";
        if (!map[hid]) {
          map[hid] = {
            host_id:      hid,
            agent_id:     r.get("agent_id")  || "—",
            agency_id:    r.get("agency_id") || "—",
            admin_id:     r.get("admin_id")  || "—",
            records:      0,
            total_earning:0,
            total_bonus:  0,
            total_duration:0,
            by_type: {},   // { livestreaming: { earning, bonus, duration, count } }
            latest_date:  null,
          };
        }
        const g = map[hid];
        g.records++;

        const earn = Number(r.get("earning")  || 0);
        const bon  = Number(r.get("bonus")    || 0);
        const dur  = Number(r.get("duration") || 0);
        const type = r.get("type") || "other";
        const dt   = r.get("datetime");

        g.total_earning  += earn;
        g.total_bonus    += bon;
        g.total_duration += dur;

        if (!g.by_type[type]) g.by_type[type] = { earning: 0, bonus: 0, duration: 0, count: 0 };
        g.by_type[type].earning  += earn;
        g.by_type[type].bonus    += bon;
        g.by_type[type].duration += dur;
        g.by_type[type].count++;

        if (dt && (!g.latest_date || new Date(dt) > new Date(g.latest_date)))
          g.latest_date = dt;
      });

      setRows(Object.values(map));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 80);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── sort + filter ── */
  const processed = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.host_id.toLowerCase().includes(q)   ||
        r.agent_id.toLowerCase().includes(q)  ||
        r.agency_id.toLowerCase().includes(q) ||
        r.admin_id.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [rows, search, sortCol, sortDir]);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <FontAwesomeIcon icon={faSort} className="ae-sort-icon" />;
    return <FontAwesomeIcon icon={sortDir === "desc" ? faSortDown : faSortUp} className="ae-sort-icon ae-sort-icon--active" />;
  };

  /* ── summary totals ── */
  const totals = useMemo(() => ({
    hosts:   processed.length,
    earning: processed.reduce((s, r) => s + r.total_earning,  0),
    bonus:   processed.reduce((s, r) => s + r.total_bonus,    0),
    dur:     processed.reduce((s, r) => s + r.total_duration, 0),
    records: processed.reduce((s, r) => s + r.records,        0),
  }), [processed]);

  const maxEarn = processed.length > 0
    ? Math.max(...processed.map(r => r.total_earning))
    : 1;

  /* ══════════════════════════════════════════════════════
     EXPORT FUNCTIONS
  ══════════════════════════════════════════════════════ */

  /* build flat export data */
  const getExportData = () => processed.map((r, i) => ({
    Rank:           i + 1,
    Host_ID:        r.host_id,
    Agent_ID:       r.agent_id,
    Agency_ID:      r.agency_id,
    Admin_ID:       r.admin_id,
    Total_Earning:  fmtNumRaw(r.total_earning),
    Total_Bonus:    fmtNumRaw(r.total_bonus),
    Total_Duration: fmtNumRaw(r.total_duration),
    Records:        r.records,
    Latest_Date:    r.latest_date ? new Date(r.latest_date).toLocaleDateString("en-GB") : "—",
    ...Object.fromEntries(
      Object.entries(r.by_type).map(([t, v]) => [
        `${t}_earning`, fmtNumRaw(v.earning),
      ])
    ),
  }));

  /* ── Copy as text ── */
  const handleCopy = () => {
    const data = getExportData();
    const headers = Object.keys(data[0] || {}).join("\t");
    const body    = data.map(r => Object.values(r).join("\t")).join("\n");
    copyText(headers + "\n" + body);
    showToast("Copied to clipboard!", "copy");
    setExportOpen(false);
  };

  /* ── Export CSV ── */
  const handleCSV = () => {
    const data    = getExportData();
    const headers = Object.keys(data[0] || {}).join(",");
    const body    = data.map(r =>
      Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `earnings_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded!", "success");
    setExportOpen(false);
  };

  /* ── Export Excel (XLSX via SheetJS CDN) ── */
  const handleExcel = async () => {
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const data = getExportData();
      const ws   = XLSX.utils.json_to_sheet(data);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Earnings");
      XLSX.writeFile(wb, `earnings_${Date.now()}.xlsx`);
      showToast("Excel downloaded!", "success");
    } catch {
      /* fallback: CSV with .xlsx hint */
      handleCSV();
      showToast("Excel exported as CSV", "info");
    }
    setExportOpen(false);
  };

  /* ── Export PDF (basic HTML print) ── */
  const handlePDF = () => {
    const data  = getExportData();
    const cols  = ["Rank","Host_ID","Agent_ID","Total_Earning","Total_Bonus","Total_Duration","Records"];
    const thead = cols.map(c => `<th>${c.replace(/_/g," ")}</th>`).join("");
    const tbody = data.map(r =>
      `<tr>${cols.map(c => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`
    ).join("");
    const html  = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Earnings Report</title>
      <style>
        body{font-family:sans-serif;font-size:11px;padding:20px;}
        h2{margin-bottom:12px;font-size:16px;}
        table{border-collapse:collapse;width:100%;}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
        th{background:#1a1a2e;color:#fff;}
        tr:nth-child(even){background:#f9f9f9;}
      </style></head><body>
      <h2>Agency Earnings Report — ${new Date().toLocaleDateString()}</h2>
      <p>Total Hosts: ${totals.hosts} | Total Earning: ${fmtNum(totals.earning)} | Total Bonus: ${fmtNum(totals.bonus)}</p>
      <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
    showToast("PDF print dialog opened!", "success");
    setExportOpen(false);
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="ae-root">

      {/* Toast */}
      {toast && (
        <div className={`ae-toast ae-toast--${toast.type}`}>
          <span className="ae-toast-dot" />{toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="ae-header">
        <div className="ae-header-left">
          <span className="ae-eyebrow">Agency Management</span>
          <h1 className="ae-title">All Earnings</h1>
          <span className="ae-subtitle">
            {loading ? "Loading…"
              : `${totals.hosts} hosts · ${totals.records.toLocaleString()} records · Total: ${fmtNum(totals.earning)}`}
          </span>
        </div>
        <div className="ae-header-right">
          {/* Export dropdown */}
          <div className="ae-export-wrap" ref={exportRef}>
            <button className="ae-export-btn" onClick={() => setExportOpen(o => !o)}
              disabled={loading || !processed.length}>
              <FontAwesomeIcon icon={faFileExport} />
              Export
              <FontAwesomeIcon icon={faChevronDown} className="ae-export-arrow" />
            </button>
            {exportOpen && (
              <div className="ae-export-dropdown">
                <button className="ae-export-opt" onClick={handleCopy}>
                  <FontAwesomeIcon icon={faCopy} /> Copy to Clipboard
                </button>
                <button className="ae-export-opt ae-export-opt--csv" onClick={handleCSV}>
                  <FontAwesomeIcon icon={faFileCsv} /> Download CSV
                </button>
                <button className="ae-export-opt ae-export-opt--excel" onClick={handleExcel}>
                  <FontAwesomeIcon icon={faFileExcel} /> Download Excel
                </button>
                <button className="ae-export-opt ae-export-opt--pdf" onClick={handlePDF}>
                  <FontAwesomeIcon icon={faFilePdf} /> Export PDF
                </button>
              </div>
            )}
          </div>
          <button className="ae-refresh-btn" onClick={fetchData} disabled={loading}>
            {loading ? <span className="ae-spin" /> : <FontAwesomeIcon icon={faRotateRight} />}
          </button>
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      {!loading && (
        <div className="ae-stat-row">
          {[
            { label: "Total Hosts",    val: totals.hosts.toLocaleString(),   color: "#818cf8" },
            { label: "Total Records",  val: totals.records.toLocaleString(), color: "#60a5fa" },
            { label: "Total Earning",  val: fmtNum(totals.earning),          color: "#fbbf24" },
            { label: "Total Bonus",    val: fmtNum(totals.bonus),            color: "#34d399" },
            { label: "Total Duration", val: fmtDur(totals.dur),              color: "#2dd4bf" },
          ].map((s, i) => (
            <div key={i} className="ae-stat-card" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="ae-stat-val" style={{ color: s.color }}>{s.val}</span>
              <span className="ae-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      <div className="ae-toolbar">
        <div className="ae-search-wrap">
          <FontAwesomeIcon icon={faSearch} className="ae-search-icon" />
          <input className="ae-search"
            placeholder="Search by host ID, agent ID, agency ID or admin ID…"
            value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="ae-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="ae-result-count">
            {processed.length} host{processed.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="ae-loading">
          <div className="ae-loading-ring" />
          <div className="ae-loading-ring ae-loading-ring--2" />
          <p>Fetching and grouping earnings…</p>
        </div>
      ) : processed.length === 0 ? (
        <div className="ae-empty">
          <div className="ae-empty-icon">◎</div>
          <p>No earnings data found</p>
          <button className="ae-empty-reset" onClick={() => setSearch("")}>Clear search</button>
        </div>
      ) : (
        <div className={`ae-table-wrap ${animated ? "in" : ""}`}>

          {/* ── Table header ── */}
          <div className="ae-thead">
            <div className="ae-th" style={{ width: 52 }}>Rank</div>
            <div className="ae-th ae-th--grow">Host ID</div>
            <div className="ae-th ae-th--id ae-th--hide-sm">Agent ID</div>
            <div className="ae-th ae-th--id ae-th--hide-md">Agency ID</div>
            <div className="ae-th ae-th--num ae-th--sortable" onClick={() => handleSort("records")}>
              Records <SortIcon col="records" />
            </div>
            <div className="ae-th ae-th--num ae-th--sortable" onClick={() => handleSort("total_earning")}>
              Earning <SortIcon col="total_earning" />
            </div>
            <div className="ae-th ae-th--num ae-th--sortable ae-th--hide-md" onClick={() => handleSort("total_bonus")}>
              Bonus <SortIcon col="total_bonus" />
            </div>
            <div className="ae-th ae-th--num ae-th--sortable ae-th--hide-md" onClick={() => handleSort("total_duration")}>
              Duration <SortIcon col="total_duration" />
            </div>
            <div className="ae-th" style={{ width: 36 }} />
          </div>

          {/* ── Rows ── */}
          {processed.map((r, i) => {
            const color    = getAvatarColor(r.host_id);
            const barPct   = maxEarn > 0 ? (r.total_earning / maxEarn) * 100 : 0;
            const isExpand = expandedId === r.host_id;
            const types    = Object.entries(r.by_type);

            return (
              <div key={r.host_id}
                className={`ae-row-block ${animated ? "in" : ""}`}
                style={{ animationDelay: `${Math.min(i * 28, 700)}ms` }}>

                {/* Main row */}
                <div className={`ae-row ${isExpand ? "ae-row--open" : ""}`}
                  onClick={() => setExpandedId(isExpand ? null : r.host_id)}>

                  {/* Rank + avatar */}
                  <div className="ae-rank-cell">
                    <span className="ae-rank">{i + 1}</span>
                    <div className="ae-av" style={{ background: color }}>
                      {getInitial(r.host_id)}
                    </div>
                  </div>

                  {/* Host ID + bar */}
                  <div className="ae-cell ae-cell--grow">
                    <span className="ae-host-id" title={r.host_id}>{r.host_id}</span>
                    <div className="ae-bar-track">
                      <div className="ae-bar-fill" style={{
                        width: animated ? `${Math.max(barPct, 0.5)}%` : "0%",
                        background: `linear-gradient(90deg, ${color}, ${color}99)`,
                        transitionDelay: `${Math.min(i * 28, 700)}ms`,
                      }} />
                    </div>
                  </div>

                  {/* Agent ID */}
                  <div className="ae-cell ae-cell--id ae-cell--hide-sm">
                    <span className="ae-id-val">{r.agent_id}</span>
                  </div>

                  {/* Agency ID */}
                  <div className="ae-cell ae-cell--id ae-cell--hide-md">
                    <span className="ae-id-val">{r.agency_id}</span>
                  </div>

                  {/* Records */}
                  <div className="ae-cell ae-cell--num">
                    <span className="ae-val ae-val--rec">{r.records}</span>
                  </div>

                  {/* Earning */}
                  <div className="ae-cell ae-cell--num">
                    <span className="ae-val ae-val--earn">{fmtNum(r.total_earning)}</span>
                  </div>

                  {/* Bonus */}
                  <div className="ae-cell ae-cell--num ae-cell--hide-md">
                    <span className="ae-val ae-val--bonus">{fmtNum(r.total_bonus)}</span>
                  </div>

                  {/* Duration */}
                  <div className="ae-cell ae-cell--num ae-cell--hide-md">
                    <span className="ae-val ae-val--dur">{fmtDur(r.total_duration)}</span>
                  </div>

                  {/* Expand */}
                  <div className="ae-cell ae-cell--expand">
                    <FontAwesomeIcon icon={isExpand ? faChevronUp : faChevronDown} />
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {isExpand && (
                  <div className="ae-detail">

                    {/* IDs row */}
                    <div className="ae-detail-ids">
                      {[
                        { label: "Host ID",   val: r.host_id   },
                        { label: "Agent ID",  val: r.agent_id  },
                        { label: "Agency ID", val: r.agency_id },
                        { label: "Admin ID",  val: r.admin_id  },
                      ].map(id => (
                        <div key={id.label} className="ae-id-chip"
                          onClick={() => { copyText(id.val); showToast(`Copied: ${id.val}`, "copy"); }}
                          title="Click to copy">
                          <span className="ae-id-chip-label">{id.label}</span>
                          <span className="ae-id-chip-val">{id.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Summary cards */}
                    <div className="ae-detail-summary">
                      {[
                        { label: "Total Earning",  val: fmtNum(r.total_earning),  color: "#fbbf24", icon: faCoins },
                        { label: "Total Bonus",    val: fmtNum(r.total_bonus),    color: "#34d399", icon: faCoins },
                        { label: "Total Duration", val: fmtDur(r.total_duration), color: "#2dd4bf", icon: faClock },
                        { label: "Total Records",  val: r.records,                color: "#818cf8", icon: faCoins },
                      ].map(s => (
                        <div key={s.label} className="ae-detail-kpi">
                          <FontAwesomeIcon icon={s.icon} style={{ color: s.color, opacity: 0.6 }} />
                          <div>
                            <span className="ae-detail-kpi-val" style={{ color: s.color }}>{s.val}</span>
                            <span className="ae-detail-kpi-label">{s.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* By type breakdown */}
                    {types.length > 0 && (
                      <div className="ae-detail-types">
                        <div className="ae-detail-types-title">Breakdown by Type</div>
                        <div className="ae-type-grid">
                          {types.map(([type, v]) => (
                            <div key={type} className="ae-type-card">
                              <div className="ae-type-name">{type}</div>
                              <div className="ae-type-stats">
                                <div className="ae-type-stat">
                                  <span className="ae-type-stat-label">Earning</span>
                                  <span className="ae-type-stat-val ae-type-stat-val--earn">{fmtNum(v.earning)}</span>
                                </div>
                                <div className="ae-type-stat">
                                  <span className="ae-type-stat-label">Bonus</span>
                                  <span className="ae-type-stat-val ae-type-stat-val--bonus">{fmtNum(v.bonus)}</span>
                                </div>
                                <div className="ae-type-stat">
                                  <span className="ae-type-stat-label">Duration</span>
                                  <span className="ae-type-stat-val ae-type-stat-val--dur">{fmtDur(v.duration)}</span>
                                </div>
                                <div className="ae-type-stat">
                                  <span className="ae-type-stat-label">Count</span>
                                  <span className="ae-type-stat-val">{v.count}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}

          {/* ── Footer totals row ── */}
          <div className="ae-tfoot">
            <div style={{ width: 52, flexShrink: 0 }} />
            <div className="ae-tf-cell ae-tf-cell--grow">
              <span className="ae-tf-label">Grand Total ({processed.length} hosts)</span>
            </div>
            <div className="ae-tf-cell ae-tf-cell--hide-sm" />
            <div className="ae-tf-cell ae-tf-cell--hide-md" />
            <div className="ae-tf-cell ae-tf-cell--num">
              <span className="ae-tf-val">{totals.records}</span>
            </div>
            <div className="ae-tf-cell ae-tf-cell--num">
              <span className="ae-tf-val ae-tf-val--earn">{fmtNum(totals.earning)}</span>
            </div>
            <div className="ae-tf-cell ae-tf-cell--num ae-tf-cell--hide-md">
              <span className="ae-tf-val ae-tf-val--bonus">{fmtNum(totals.bonus)}</span>
            </div>
            <div className="ae-tf-cell ae-tf-cell--num ae-tf-cell--hide-md">
              <span className="ae-tf-val ae-tf-val--dur">{fmtDur(totals.dur)}</span>
            </div>
            <div style={{ width: 36, flexShrink: 0 }} />
          </div>

        </div>
      )}

    </div>
  );
}