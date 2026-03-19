// GameHistory.jsx
import React, { useState, useMemo, useEffect } from "react";
import Parse from "../../parseConfig";
import "./GamesHistory.css";

/* ─────────────────────────────────────────
   DUMMY DATA
───────────────────────────────────────── */
function generateDummyData() {
  var names = [
    "Alex Johnson","Maria Garcia","Chen Wei","Priya Patel",
    "Omar Hassan","Sophie Martin","Lucas Silva","Aisha Nkomo",
    "Riku Tanaka","Elena Petrov","James O'Brien","Fatima Al-Farsi",
    "Carlos Mendez","Yuki Yamamoto","Sara Lindqvist","Kwame Asante",
    "Ananya Roy","Dmitri Volkov","Layla Hussain","Tom Fischer",
    "Mei Lin","Ahmed Khalil","Nadia Dupont","Bruno Costa",
    "Isabella Romano","Sven Eriksson","Zara Khan","Felix Wagner",
    "Amara Diallo","Viktor Novak",
  ];

  var data = [];
  var balance = 10000;
  var now = Date.now();

  for (var i = 0; i < 47; i++) {
    var isProfit = Math.random() > 0.45;
    var score    = isProfit
      ? Math.floor(Math.random() * 800) + 50
      : -(Math.floor(Math.random() * 600) + 30);
    balance += score;
    var created = new Date(now - (47 - i) * 3600000 * (Math.random() * 8 + 1));

    data.push({
      objectId:       "OBJ" + String(1000 + i).padStart(4,"0"),
      createdAt:      created.toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" }),
      userName:       names[i % names.length],
      userUID:        "UID" + String(Math.floor(Math.random() * 900000) + 100000),
      orderId:        "ORD-" + String(Math.floor(Math.random() * 90000) + 10000),
      mgId:           "MG-" + String(Math.floor(Math.random() * 9000) + 1000),
      roundId:        "RND-" + String(Math.floor(Math.random() * 9000) + 1000),
      score:          score,
      currentBalance: Math.max(0, balance),
      type:           isProfit ? "PROFIT" : "LOSS",
    });
  }
  return data;
}

var DUMMY_DATA = generateDummyData();
var PER_PAGE   = 10;

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
function IconTrash() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconTrendUp() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTrendDown() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M23 18l-9.5-9.5-5 5L1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 18h6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconEmpty() {
  return (
    <svg width="52" height="52" fill="none" viewBox="0 0 24 24" opacity=".25">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtBalance(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtScore(n) {
  return (n > 0 ? "+" : "") + n.toLocaleString();
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ variant, records, score, icon }) {
  var isProfit = variant === "profit";
  return (
    <div className={"gh-stat-card " + (isProfit ? "profit" : "loss")}>
      <div className="gh-stat-icon">{icon}</div>
      <div className="gh-stat-content">
        <div className="gh-stat-row">
          <div className="gh-stat-block">
            <span className="gh-stat-label">Total {isProfit ? "Profit" : "Loss"} Records</span>
            <span className="gh-stat-value">{records.toLocaleString()}</span>
          </div>
          <div className="gh-stat-divider" />
          <div className="gh-stat-block">
            <span className="gh-stat-label">Total {isProfit ? "Profit" : "Loss"} Score</span>
            <span className="gh-stat-value score">{fmtScore(score)}</span>
          </div>
        </div>
      </div>
      <div className="gh-stat-glow" />
    </div>
  );
}

/* ─────────────────────────────────────────
   TYPE BADGE
───────────────────────────────────────── */
function TypeBadge({ type }) {
  return (
    <span className={"gh-badge " + (type === "PROFIT" ? "profit" : "loss")}>
      {type === "PROFIT" ? "▲ Profit" : "▼ Loss"}
    </span>
  );
}

/* ─────────────────────────────────────────
   CONFIRM MODAL
───────────────────────────────────────── */
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="gh-modal-overlay" onClick={onCancel}>
      <div className="gh-modal" onClick={function(e) { e.stopPropagation(); }}>
        <div className="gh-modal-icon">
          <IconTrash />
        </div>
        <h3 className="gh-modal-title">Clear All History?</h3>
        <p className="gh-modal-desc">
          This will permanently delete all game history records. This action cannot be undone.
        </p>
        <div className="gh-modal-actions">
          <button className="gh-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="gh-modal-confirm" onClick={onConfirm}>Yes, Clear All</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function GameHistory() {
  var [data,       setData]       = useState([]);
  var [loading,    setLoading]    = useState(true);
  var [page,       setPage]       = useState(0);
  var [showModal,  setShowModal]  = useState(false);
  var [filterType, setFilterType] = useState("ALL"); // ALL | PROFIT | LOSS

  /* Simulate loading */
useEffect(function() {
  setLoading(true);
  var q = new Parse.Query(Parse.Object.extend("GamesHistory"));
  q.descending("createdAt");
  q.limit(2000);
  q.find().then(function(results) {
    var mapped = results.map(function(r) {
      return {
        objectId:       r.id,
        createdAt:      new Date(r.get("createdAt")).toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" }),
        userName:       r.get("userName")       || r.get("username") || "—",
        userUID:        r.get("userUID")        || r.get("uid")      || "—",
        orderId:        r.get("orderId")        || r.get("orderID")  || "—",
        mgId:           r.get("mgId")           || r.get("mgID")     || "—",
        roundId:        r.get("roundId")        || r.get("roundID")  || "—",
        score:          r.get("score")          || 0,
        currentBalance: r.get("currentBalance") || r.get("balance")  || 0,
        type:           r.get("type")           || (r.get("score") >= 0 ? "PROFIT" : "LOSS"),
      };
    });
    setData(mapped);
    setLoading(false);
  }).catch(function(err) {
    console.error("Fetch error:", err);
    setLoading(false);
  });
}, []);

  /* Reset page on filter change */
  useEffect(function() { setPage(0); }, [filterType]);

  /* ── Stats ── */
  var profitRows  = useMemo(function() { return data.filter(function(r) { return r.type === "PROFIT"; }); }, [data]);
  var lossRows    = useMemo(function() { return data.filter(function(r) { return r.type === "LOSS"; }); }, [data]);
  var profitScore = useMemo(function() { return profitRows.reduce(function(a,r) { return a+r.score; }, 0); }, [profitRows]);
  var lossScore   = useMemo(function() { return lossRows.reduce(function(a,r) { return a+r.score; }, 0); }, [lossRows]);

  /* ── Filtered data ── */
  var filtered = useMemo(function() {
    if (filterType === "ALL") return data;
    return data.filter(function(r) { return r.type === filterType; });
  }, [data, filterType]);

  /* ── Pagination ── */
  var totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  var safePage   = Math.min(page, totalPages - 1);
  var pageItems  = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  var startIdx   = filtered.length === 0 ? 0 : safePage * PER_PAGE + 1;
  var endIdx     = Math.min((safePage + 1) * PER_PAGE, filtered.length);

  /* Smart page numbers */
  var pageNums = useMemo(function() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, function(_, i) { return i; });
    var arr = [0];
    if (safePage > 2) arr.push("…");
    for (var i = Math.max(1, safePage-1); i <= Math.min(totalPages-2, safePage+1); i++) arr.push(i);
    if (safePage < totalPages-3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  /* ── Handlers ── */
  function handleClearAll() {
    setData([]);
    setPage(0);
    setShowModal(false);
  }

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <div className="gh-page">
      <div className="gh-topline" />

      {/* ── CONFIRM MODAL ── */}
      {showModal && (
        <ConfirmModal
          onConfirm={handleClearAll}
          onCancel={function() { setShowModal(false); }}
        />
      )}

      <div className="gh-wrap">

        {/* ── BREADCRUMB + HEADER ── */}
        <div className="gh-topbar">
          <div className="gh-breadcrumb">
            <span className="gh-bc-root">Game History</span>
            <span className="gh-bc-sep">›</span>
            <span className="gh-bc-current">Sud Game History</span>
          </div>
          <button
            className="gh-clear-btn"
            type="button"
            onClick={function() { setShowModal(true); }}
            disabled={data.length === 0 || loading}
          >
            <IconTrash />
            Clear All History
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="gh-stats">
          <StatCard
            variant="profit"
            records={profitRows.length}
            score={profitScore}
            icon={<IconTrendUp />}
          />
          <StatCard
            variant="loss"
            records={lossRows.length}
            score={lossScore}
            icon={<IconTrendDown />}
          />
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="gh-filter-row">
          <div className="gh-filters">
            {["ALL","PROFIT","LOSS"].map(function(f) {
              return (
                <button
                  key={f}
                  type="button"
                  className={"gh-filter-pill" + (filterType === f ? " active " + f.toLowerCase() : "")}
                  onClick={function() { setFilterType(f); }}
                >
                  {f === "ALL" ? "All Records" : f === "PROFIT" ? "▲ Profit Only" : "▼ Loss Only"}
                </button>
              );
            })}
          </div>
          <div className="gh-record-count">
            {loading ? "Loading…" : (
              <>Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{filtered.length}</strong> records</>
            )}
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="gh-card">

          {/* LOADING */}
          {loading && (
            <div className="gh-loading">
              <div className="gh-loading-dots">
                <span /><span /><span />
              </div>
              <p>Loading game history…</p>
            </div>
          )}

          {/* EMPTY */}
          {!loading && filtered.length === 0 && (
            <div className="gh-empty">
              <IconEmpty />
              <div className="gh-empty-title">No Data Found</div>
              <div className="gh-empty-desc">
                {data.length === 0
                  ? "All history has been cleared."
                  : "No records match the selected filter."}
              </div>
            </div>
          )}

          {/* TABLE — desktop */}
          {!loading && filtered.length > 0 && (
            <>
              <div className="gh-tbl-scroll">
                <table className="gh-tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object ID</th>
                      <th>Created At</th>
                      <th>User Name</th>
                      <th>User UID</th>
                      <th>Order ID</th>
                      <th>MG ID</th>
                      <th>Round ID</th>
                      <th>Score</th>
                      <th>Current Balance</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(function(row, idx) {
                      return (
                        <tr key={row.objectId} className={row.type === "PROFIT" ? "row-profit" : "row-loss"}>
                          <td><span className="gh-num">{startIdx + idx}</span></td>
                          <td>
                            <span className="gh-oid"
                              title={"Click to copy: " + row.objectId}
                              onClick={function() {
                                if (navigator.clipboard) navigator.clipboard.writeText(row.objectId);
                              }}>
                              {row.objectId}
                            </span>
                          </td>
                          <td><span className="gh-date">{row.createdAt}</span></td>
                          <td>
                            <div className="gh-user-cell">
                              <div className="gh-avatar">
                                {row.userName.charAt(0)}
                              </div>
                              <span className="gh-username">{row.userName}</span>
                            </div>
                          </td>
                          <td><span className="gh-uid">{row.userUID}</span></td>
                          <td><span className="gh-id-tag">{row.orderId}</span></td>
                          <td><span className="gh-id-tag">{row.mgId}</span></td>
                          <td><span className="gh-id-tag">{row.roundId}</span></td>
                          <td>
                            <span className={"gh-score " + (row.score >= 0 ? "pos" : "neg")}>
                              {fmtScore(row.score)}
                            </span>
                          </td>
                          <td>
                            <span className="gh-balance">
                              {fmtBalance(row.currentBalance)}
                            </span>
                          </td>
                          <td><TypeBadge type={row.type} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="gh-mob-list">
                {pageItems.map(function(row, idx) {
                  return (
                    <div key={row.objectId}
                      className={"gh-mob-card " + (row.type === "PROFIT" ? "profit" : "loss")}>
                      {/* Card header */}
                      <div className="gh-mob-card-hdr">
                        <div className="gh-mob-avatar">{row.userName.charAt(0)}</div>
                        <div className="gh-mob-hdr-info">
                          <span className="gh-mob-username">{row.userName}</span>
                          <span className="gh-mob-date">{row.createdAt}</span>
                        </div>
                        <TypeBadge type={row.type} />
                      </div>

                      {/* Score highlight */}
                      <div className="gh-mob-score-row">
                        <div className="gh-mob-score-block">
                          <span className="gh-mob-score-label">Score</span>
                          <span className={"gh-score lg " + (row.score >= 0 ? "pos" : "neg")}>
                            {fmtScore(row.score)}
                          </span>
                        </div>
                        <div className="gh-mob-score-block">
                          <span className="gh-mob-score-label">Balance</span>
                          <span className="gh-balance lg">{fmtBalance(row.currentBalance)}</span>
                        </div>
                      </div>

                      {/* Detail grid */}
                      <div className="gh-mob-grid">
                        {[
                          { label: "Object ID",    value: row.objectId },
                          { label: "User UID",     value: row.userUID },
                          { label: "Order ID",     value: row.orderId },
                          { label: "MG ID",        value: row.mgId },
                          { label: "Round ID",     value: row.roundId },
                        ].map(function(f) {
                          return (
                            <div key={f.label} className="gh-mob-field">
                              <span className="gh-mob-label">{f.label}</span>
                              <span className="gh-mob-value">{f.value}</span>
                            </div>
                          );
                        })}
                        <div className="gh-mob-field">
                          <span className="gh-mob-label">Row #</span>
                          <span className="gh-mob-value">{startIdx + idx}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION */}
              <div className="gh-pagination">
                <div className="gh-page-info">
                  Page <strong>{safePage + 1}</strong> of <strong>{totalPages}</strong>
                </div>
                <div className="gh-page-btns">
                  <button className="gh-pg-btn" type="button"
                    onClick={function() { setPage(function(p) { return Math.max(0,p-1); }); }}
                    disabled={safePage === 0}>
                    <IconChevronLeft />
                  </button>

                  {pageNums.map(function(p, i) {
                    if (p === "…") {
                      return <span key={"el"+i} className="gh-pg-ellipsis">…</span>;
                    }
                    return (
                      <button key={p} type="button"
                        className={"gh-pg-btn num" + (safePage === p ? " active" : "")}
                        onClick={function() { setPage(p); }}>
                        {p + 1}
                      </button>
                    );
                  })}

                  <button className="gh-pg-btn" type="button"
                    onClick={function() { setPage(function(p) { return Math.min(totalPages-1,p+1); }); }}
                    disabled={safePage >= totalPages - 1}>
                    <IconChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}