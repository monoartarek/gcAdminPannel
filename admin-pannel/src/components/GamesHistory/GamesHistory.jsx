// GameHistory.jsx
import React, { useState, useMemo, useEffect } from "react";
import Parse from "../../parseConfig";

/* ─────────────────────────────────────────
   ICONS (Tailwind compatible)
───────────────────────────────────────── */
const IconTrash = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconTrendUp = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTrendDown = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
    <path d="M23 18l-9.5-9.5-5 5L1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 18h6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconEmpty = () => (
  <svg width="52" height="52" fill="none" viewBox="0 0 24 24" opacity=".25">
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const fmtBalance = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtScore = (n) => (n > 0 ? "+" : "") + n.toLocaleString();

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
const StatCard = ({ variant, records, score, icon }) => {
  const isProfit = variant === "profit";
  return (
    <div className={`relative rounded-2xl p-6 flex items-center gap-5 overflow-hidden shadow-lg transition-all duration-200 hover:scale-[1.01] ${
      isProfit 
        ? "bg-gradient-to-br from-[#0a1f12] to-[#0d2b1a] border border-green-500/30" 
        : "bg-gradient-to-br from-[#1a0a0a] to-[#2a0d0d] border border-red-500/30"
    }`}>
      <div className={`absolute inset-0 pointer-events-none ${
        isProfit ? "bg-[radial-gradient(ellipse_200px_150px_at_90%_50%,rgba(34,197,94,0.14),transparent)]" 
                 : "bg-[radial-gradient(ellipse_200px_150px_at_90%_50%,rgba(239,68,68,0.12),transparent)]"
      }`} />
      
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
        isProfit 
          ? "bg-green-500/15 border border-green-500/30 text-green-400" 
          : "bg-red-500/15 border border-red-500/30 text-red-400"
      }`}>
        {icon}
      </div>
      
      <div className="flex-1 relative z-10">
        <div className="flex items-stretch gap-0">
          <div className="flex-1 flex flex-col gap-1">
            <span className={`text-[0.68rem] font-bold uppercase tracking-wide ${
              isProfit ? "text-green-400/60" : "text-red-400/60"
            }`}>
              Total {isProfit ? "Profit" : "Loss"} Records
            </span>
            <span className={`text-[1.6rem] font-extrabold font-mono leading-none ${
              isProfit ? "text-green-400" : "text-red-400"
            }`}>
              {records.toLocaleString()}
            </span>
          </div>
          <div className="w-px bg-white/10 mx-5 flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1">
            <span className={`text-[0.68rem] font-bold uppercase tracking-wide ${
              isProfit ? "text-green-400/60" : "text-red-400/60"
            }`}>
              Total {isProfit ? "Profit" : "Loss"} Score
            </span>
            <span className={`text-[1.4rem] font-extrabold font-mono leading-none ${
              isProfit ? "text-green-400" : "text-red-400"
            }`}>
              {fmtScore(score)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   TYPE BADGE
───────────────────────────────────────── */
const TypeBadge = ({ type }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-extrabold tracking-wide whitespace-nowrap ${
    type === "PROFIT" 
      ? "bg-green-500/15 border border-green-500/30 text-green-400" 
      : "bg-red-500/15 border border-red-500/30 text-red-400"
  }`}>
    {type === "PROFIT" ? "▲ Profit" : "▼ Loss"}
  </span>
);

/* ─────────────────────────────────────────
   CONFIRM MODAL
───────────────────────────────────────── */
const ConfirmModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-[#080c14]/90 backdrop-blur-md z-[500] flex items-center justify-center p-5 animate-[fadeIn_0.2s_ease]" onClick={onCancel}>
    <div className="relative bg-[#101828] border border-red-500/30 rounded-2xl p-8 sm:p-9 max-w-[420px] w-full text-center shadow-2xl animate-[modalIn_0.3s_cubic-bezier(0.22,1,0.36,1)]" onClick={(e) => e.stopPropagation()}>
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-red-600 via-red-400 to-red-600 rounded-t-2xl" />
      <div className="w-14 h-14 rounded-full bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-5 text-red-400">
        <IconTrash />
      </div>
      <h3 className="text-lg font-extrabold text-gray-100 mb-2">Clear All History?</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">
        This will permanently delete all game history records. This action cannot be undone.
      </p>
      <div className="flex gap-3 justify-center">
        <button className="px-6 py-2.5 bg-[#162035] text-gray-400 border border-white/10 rounded-xl font-semibold text-sm hover:bg-[#1e2d47] hover:text-gray-100 transition-all" onClick={onCancel}>
          Cancel
        </button>
        <button className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/30 hover:brightness-110 hover:-translate-y-px transition-all" onClick={onConfirm}>
          Yes, Clear All
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function GameHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  const PER_PAGE = 10;

  useEffect(() => {
    setLoading(true);
    const q = new Parse.Query(Parse.Object.extend("GamesHistory"));
    q.descending("createdAt");
    q.limit(2000);
    q.find().then((results) => {
      const mapped = results.map((r) => ({
        objectId: r.id,
        createdAt: new Date(r.get("createdAt")).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        userName: r.get("userName") || r.get("username") || "—",
        userUID: r.get("userUID") || r.get("uid") || "—",
        orderId: r.get("orderId") || r.get("orderID") || "—",
        mgId: r.get("mgId") || r.get("mgID") || "—",
        roundId: r.get("roundId") || r.get("roundID") || "—",
        score: r.get("score") || 0,
        currentBalance: r.get("currentBalance") || r.get("balance") || 0,
        type: r.get("type") || (r.get("score") >= 0 ? "PROFIT" : "LOSS"),
      }));
      setData(mapped);
      setLoading(false);
    }).catch((err) => {
      console.error("Fetch error:", err);
      setLoading(false);
    });
  }, []);

  useEffect(() => { setPage(0); }, [filterType]);

  const profitRows = useMemo(() => data.filter((r) => r.type === "PROFIT"), [data]);
  const lossRows = useMemo(() => data.filter((r) => r.type === "LOSS"), [data]);
  const profitScore = useMemo(() => profitRows.reduce((a, r) => a + r.score, 0), [profitRows]);
  const lossScore = useMemo(() => lossRows.reduce((a, r) => a + r.score, 0), [lossRows]);

  const filtered = useMemo(() => {
    if (filterType === "ALL") return data;
    return data.filter((r) => r.type === filterType);
  }, [data, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  const startIdx = filtered.length === 0 ? 0 : safePage * PER_PAGE + 1;
  const endIdx = Math.min((safePage + 1) * PER_PAGE, filtered.length);

  const pageNums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const arr = [0];
    if (safePage > 2) arr.push("…");
    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) arr.push(i);
    if (safePage < totalPages - 3) arr.push("…");
    arr.push(totalPages - 1);
    return arr;
  }, [totalPages, safePage]);

  const handleClearAll = () => {
    setData([]);
    setPage(0);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#080c14] font-sans text-gray-100 p-4 sm:p-6 md:p-8 relative overflow-x-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_800px_500px_at_15%_5%,rgba(59,130,246,0.05),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_600px_400px_at_85%_90%,rgba(34,197,94,0.04),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_400px_300px_at_50%_50%,rgba(239,68,68,0.025),transparent)]" />
      </div>

      {/* Top gradient strip */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 via-green-500 via-red-500 to-transparent z-[200]" />

      <div className="max-w-[1440px] mx-auto relative z-10">
        {showModal && <ConfirmModal onConfirm={handleClearAll} onCancel={() => setShowModal(false)} />}

        {/* Header Section */}
        <div className="flex items-center justify-between gap-3.5 mb-6 flex-wrap animate-[slideDown_0.4s_cubic-bezier(0.22,1,0.36,1)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
              Game History
            </span>
            <span className="text-gray-700 text-sm">›</span>
            <span className="text-xs font-bold text-gray-100">Sud Game History</span>
          </div>
          <button
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-red-600 to-red-500 text-white rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/40 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap"
            onClick={() => setShowModal(true)}
            disabled={data.length === 0 || loading}
          >
            <IconTrash />
            Clear All History
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_0.06s]">
          <StatCard variant="profit" records={profitRows.length} score={profitScore} icon={<IconTrendUp />} />
          <StatCard variant="loss" records={lossRows.length} score={lossScore} icon={<IconTrendDown />} />
        </div>

        {/* Filter Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3 animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_0.1s]">
          <div className="flex gap-2 flex-wrap">
            {["ALL", "PROFIT", "LOSS"].map((f) => (
              <button
                key={f}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  filterType === f
                    ? f === "ALL"
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : f === "PROFIT"
                      ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : "bg-red-500/15 border-red-500/30 text-red-400"
                    : "border-white/10 bg-[#101828] text-gray-400 hover:border-white/20 hover:text-gray-300"
                }`}
                onClick={() => setFilterType(f)}
              >
                {f === "ALL" ? "All Records" : f === "PROFIT" ? "▲ Profit Only" : "▼ Loss Only"}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 font-medium">
            {loading ? (
              "Loading…"
            ) : (
              <>
                Showing <strong className="text-gray-300">{startIdx}–{endIdx}</strong> of{" "}
                <strong className="text-gray-300">{filtered.length}</strong> records
              </>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#101828] border border-white/10 rounded-2xl overflow-hidden shadow-lg animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_0.14s]">
          
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-bounce" />
              </div>
              <p className="text-sm text-gray-400 font-medium">Loading game history…</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <IconEmpty />
              <div className="text-base font-bold text-gray-300">No Data Found</div>
              <div className="text-xs text-gray-400 max-w-[300px]">
                {data.length === 0 ? "All history has been cleared." : "No records match the selected filter."}
              </div>
            </div>
          )}

          {/* Data Table & Cards */}
          {!loading && filtered.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#162035] border-b border-white/10">
                    <tr>
                      {["#", "Object ID", "Created At", "User Name", "User UID", "Order ID", "MG ID", "Round ID", "Score", "Current Balance", "Type"].map((header) => (
                        <th key={header} className="px-3.5 py-3.5 text-left text-[0.65rem] font-extrabold uppercase tracking-wide text-gray-400 whitespace-nowrap first:pl-5 last:pr-5">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row, idx) => {
                      const isProfit = row.type === "PROFIT";
                      return (
                        <tr
                          key={row.objectId}
                          className={`border-b border-white/5 transition-colors hover:bg-white/5 ${isProfit ? "hover:bg-green-500/5" : "hover:bg-red-500/5"}`}
                        >
                          <td className="px-3.5 py-3 text-left first:pl-4">
                            <span className="text-xs font-semibold font-mono text-gray-600">{startIdx + idx}</span>
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <span
                              className="inline-block font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-400 hover:text-black transition-all whitespace-nowrap"
                              title="Click to copy"
                              onClick={() => navigator.clipboard?.writeText(row.objectId)}
                            >
                              {row.objectId}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-left whitespace-nowrap">
                            <span className="text-xs text-gray-400">{row.createdAt}</span>
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0">
                                {row.userName.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-gray-100 whitespace-nowrap">{row.userName}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <span className="font-mono text-xs text-gray-400 bg-[#162035] border border-white/10 px-2 py-1 rounded whitespace-nowrap">
                              {row.userUID}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <span className="font-mono text-xs text-gray-300 bg-[#162035] border border-white/10 px-2 py-1 rounded whitespace-nowrap">
                              {row.orderId}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <span className="font-mono text-xs text-gray-300 bg-[#162035] border border-white/10 px-2 py-1 rounded whitespace-nowrap">
                              {row.mgId}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <span className="font-mono text-xs text-gray-300 bg-[#162035] border border-white/10 px-2 py-1 rounded whitespace-nowrap">
                              {row.roundId}
                            </span>
                          </td>
                          <td className={`px-3.5 py-3 text-left font-mono text-sm font-bold whitespace-nowrap ${isProfit ? "text-green-400" : "text-red-400"}`}>
                            {fmtScore(row.score)}
                          </td>
                          <td className="px-3.5 py-3 text-left font-mono text-sm font-semibold text-gray-100 whitespace-nowrap">
                            {fmtBalance(row.currentBalance)}
                          </td>
                          <td className="px-3.5 py-3 text-left">
                            <TypeBadge type={row.type} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 p-3.5 md:hidden">
                {pageItems.map((row, idx) => {
                  const isProfit = row.type === "PROFIT";
                  return (
                    <div
                      key={row.objectId}
                      className={`relative bg-[#162035] rounded-xl p-4 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                        isProfit ? "border border-green-500/30" : "border border-red-500/30"
                      }`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                        isProfit ? "bg-gradient-to-b from-green-500 to-green-400" : "bg-gradient-to-b from-red-500 to-red-400"
                      }`} />
                      
                      {/* Card Header */}
                      <div className="flex items-center gap-2.5 mb-3.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0">
                          {row.userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-100 truncate">{row.userName}</div>
                          <div className="text-[0.68rem] text-gray-500 mt-0.5">{row.createdAt}</div>
                        </div>
                        <TypeBadge type={row.type} />
                      </div>

                      {/* Score Row */}
                      <div className="flex gap-0 mb-3.5 bg-[#1e2d47] rounded-xl overflow-hidden border border-white/10">
                        <div className="flex-1 p-3 flex flex-col gap-1 border-r border-white/10">
                          <span className="text-[0.62rem] font-extrabold uppercase tracking-wide text-gray-500">Score</span>
                          <span className={`text-xl font-bold font-mono ${isProfit ? "text-green-400" : "text-red-400"}`}>
                            {fmtScore(row.score)}
                          </span>
                        </div>
                        <div className="flex-1 p-3 flex flex-col gap-1">
                          <span className="text-[0.62rem] font-extrabold uppercase tracking-wide text-gray-500">Balance</span>
                          <span className="text-xl font-bold font-mono text-blue-400">{fmtBalance(row.currentBalance)}</span>
                        </div>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Object ID", value: row.objectId },
                          { label: "User UID", value: row.userUID },
                          { label: "Order ID", value: row.orderId },
                          { label: "MG ID", value: row.mgId },
                          { label: "Round ID", value: row.roundId },
                        ].map((field) => (
                          <div key={field.label} className="flex flex-col gap-0.5">
                            <span className="text-[0.62rem] font-bold uppercase tracking-wide text-gray-500">{field.label}</span>
                            <span className="text-xs text-gray-300 font-mono break-all">{field.value}</span>
                          </div>
                        ))}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[0.62rem] font-bold uppercase tracking-wide text-gray-500">Row #</span>
                          <span className="text-xs text-gray-300 font-mono">{startIdx + idx}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#162035] flex-wrap gap-2.5">
                <div className="text-xs text-gray-400 font-medium">
                  Page <strong className="text-gray-300">{safePage + 1}</strong> of <strong className="text-gray-300">{totalPages}</strong>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    className="min-w-[34px] h-[34px] px-2 rounded-lg border border-white/10 bg-[#1e2d47] text-gray-400 text-sm font-bold transition-all hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-25 disabled:cursor-not-allowed"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    <IconChevronLeft />
                  </button>
                  
                  {pageNums.map((p, i) => {
                    if (p === "…") {
                      return <span key={`el-${i}`} className="min-w-[34px] h-[34px] flex items-center justify-center text-gray-500 text-sm font-bold">…</span>;
                    }
                    return (
                      <button
                        key={p}
                        className={`min-w-[34px] h-[34px] px-2 rounded-lg border text-sm font-bold transition-all ${
                          safePage === p
                            ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : "border-white/10 bg-[#1e2d47] text-gray-400 hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/10"
                        }`}
                        onClick={() => setPage(p)}
                      >
                        {p + 1}
                      </button>
                    );
                  })}
                  
                  <button
                    className="min-w-[34px] h-[34px] px-2 rounded-lg border border-white/10 bg-[#1e2d47] text-gray-400 text-sm font-bold transition-all hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-25 disabled:cursor-not-allowed"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                  >
                    <IconChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tailwind keyframes animation */}
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(14px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
        .animate-bounce {
          animation: bounce 0.7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}