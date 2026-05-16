import React, { useState, useEffect, useCallback, useRef } from 'react';
import Parse from '../../parseConfig';
import {
  Search, X, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, AlertTriangle,
  Shield, History, Phone, UserMinus, UserPlus,
  Star, Filter, Download, Gem, TrendingUp,
  ArrowUpDown, Users, Clock, Hash
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── constants ──────────────────────────────── */
const PAGE_SIZE = 25;

/* ─── helpers ────────────────────────────────── */
const getInitials = (name = '?') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const COLORS = [
  'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700', 'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700',
];
const avatarColor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};
const fmt = n => Number(n || 0).toLocaleString();

/* ═══════════════════════════════════════════════
   HISTORY MODAL — full featured
═══════════════════════════════════════════════ */
const HistoryModal = ({ user, onClose }) => {
  const [searchUID, setSearchUID] = useState('');
  const [sort,      setSort]      = useState('newest');

  const raw = user.resellerHistory || [];

  /* stats (always on full raw data) */
  const totalTxns    = raw.length;
  const totalCoins   = raw.reduce((s, r) => s + (r.coin || 0), 0);
  const uniqueUIDs   = new Set(raw.map(r => r.reciver_uid)).size;
  const lastActivity = raw.length ? [...raw].reverse()[0]?.date || '—' : '—';

  /* filtered + sorted */
  let data = [...raw];
  if (searchUID.trim()) data = data.filter(r => String(r.reciver_uid).includes(searchUID.trim()));
  if      (sort === 'newest')  data = data.reverse();
  else if (sort === 'oldest')  { /* already oldest first */ }
  else if (sort === 'highest') data = data.sort((a, b) => (b.coin || 0) - (a.coin || 0));
  else if (sort === 'lowest')  data = data.sort((a, b) => (a.coin || 0) - (b.coin || 0));

  /* PDF export */
  const exportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      /* ── Title ── */
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Reseller History Report', 14, 18);

      /* ── Subtitle ── */
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Name: ${user.name}   |   UID: ${user.uid}   |   @${user.username}`, 14, 26);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);

      /* ── Summary strip ── */
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text(
        `Total Transactions: ${totalTxns}   |   Total Coins Sent: ${fmt(totalCoins)}   |   Unique Receivers: ${uniqueUIDs}   |   Last Activity: ${lastActivity}`,
        14, 38
      );

      /* ── Table ── */
      autoTable(doc, {
        head: [['#', 'Receiver UID', 'Coins Sent', 'Date', 'Time']],
        body: data.map((r, i) => [
          i + 1,
          r.reciver_uid ?? '—',
          fmt(r.coin),
          r.date || '—',
          r.time || '—',
        ]),
        startY: 44,
        theme: 'striped',
        headStyles: {
          fillColor: [109, 40, 217],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
          /* Footer on every page */
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${hookData.pageNumber} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
          );
        },
      });

      doc.save(`Reseller_History_${user.username}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed: ' + err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ marginTop: '70px' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 90px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-violet-100 shrink-0" />
            : <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(user.username)}`}>{getInitials(user.name)}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400">@{user.username} · UID #{user.uid}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition active:scale-95"
            >
              <Download size={13} /> PDF
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          {[
            { label: 'Total Transactions', value: totalTxns,      color: 'text-violet-700', bg: 'bg-violet-50',  icon: History },
            { label: 'Total Coins Sent',   value: fmt(totalCoins),color: 'text-amber-600',  bg: 'bg-amber-50',   icon: Gem     },
            { label: 'Unique Receivers',   value: uniqueUIDs,     color: 'text-sky-600',    bg: 'bg-sky-50',     icon: Users   },
            { label: 'Last Activity',      value: lastActivity,   color: 'text-emerald-600',bg: 'bg-emerald-50', icon: Clock   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 flex items-start gap-2.5`}>
              <div className="shrink-0 mt-0.5">
                <s.icon size={16} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className={`text-base font-bold leading-tight ${s.color} truncate`}>{s.value}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + Sort + Count bar ── */}
        <div className="flex flex-col sm:flex-row gap-2 px-5 py-3 border-b border-gray-100 shrink-0">
          {/* Search by receiver UID */}
          <div className="relative flex-1">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              value={searchUID}
              onChange={e => setSearchUID(e.target.value)}
              placeholder="Filter by receiver UID…"
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition"
            />
            {searchUID && (
              <button onClick={() => setSearchUID('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Coins</option>
              <option value="lowest">Lowest Coins</option>
            </select>
          </div>

          {/* Count badge */}
          <div className="flex items-center shrink-0">
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-xl font-medium whitespace-nowrap">
              {data.length} / {totalTxns} records
            </span>
          </div>
        </div>

        {/* ── Transaction Table (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <History size={36} className="mb-3 text-gray-200" />
              <p className="text-sm">No transactions found{searchUID ? ` for UID "${searchUID}"` : ''}.</p>
              {searchUID && (
                <button onClick={() => setSearchUID('')} className="mt-2 text-xs text-violet-600 hover:underline">Clear filter</button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['#', 'Receiver UID', 'Coins Sent', 'Date', 'Time'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((r, i) => (
                      <tr key={i} className="hover:bg-violet-50/40 transition-colors">
                        <td className="px-5 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <Hash size={10} />{r.reciver_uid}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                            <Gem size={11} className="text-amber-400" />{fmt(r.coin)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{r.date || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{r.time || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2 p-4">
                {data.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-400 font-mono">#{i + 1}</span>
                      <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md text-xs font-bold">
                        <Hash size={9} />{r.reciver_uid}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-sm">
                        <Gem size={12} className="text-amber-400" />{fmt(r.coin)}
                      </span>
                      <span className="text-[11px] text-gray-400">{r.date} {r.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            Total sent: <span className="font-bold text-amber-600">{fmt(data.reduce((s, r) => s + (r.coin || 0), 0))}</span> coins
          </p>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white transition font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ───────────────────────────────────── */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const s = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-gray-800' };
  return (
    <div className={`fixed top-20 right-5 z-[999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${s[type] || s.info}`}
      style={{ animation: 'fadeUp .2s ease-out' }}>
      {type === 'success' && <Shield size={14} />}
      {type === 'error'   && <AlertTriangle size={14} />}
      {msg}
    </div>
  );
};

/* ─── Confirm Modal ───────────────────────────── */
const ConfirmModal = ({ title, desc, extra, onConfirm, onCancel, loading, danger }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ marginTop: '70px' }}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-violet-100'}`}>
        {danger ? <UserMinus size={22} className="text-red-600" /> : <UserPlus size={22} className="text-violet-600" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 text-center mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center mb-4">{desc}</p>
      {extra}
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Coin Modal ──────────────────────────────── */
const CoinModal = ({ user, type, onConfirm, onCancel, loading }) => {
  const [amount, setAmount] = useState('');
  const [err,    setErr]    = useState('');
  const isAdd = type === 'inc';
  const handle = () => {
    const n = parseInt(amount);
    if (!amount || isNaN(n) || n <= 0) { setErr('Enter a valid positive number'); return; }
    onConfirm(n);
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ marginTop: '70px' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isAdd ? 'bg-emerald-100' : 'bg-red-100'}`}>
          <Gem size={22} className={isAdd ? 'text-emerald-600' : 'text-red-600'} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 text-center mb-1">{isAdd ? 'Add R-Coins' : 'Deduct R-Coins'}</h3>
        <p className="text-sm text-gray-500 text-center mb-1">{isAdd ? 'Add to' : 'Deduct from'} <strong>@{user.username}</strong></p>
        <p className="text-xs text-center text-gray-400 mb-4">Current: <span className="font-bold text-violet-600">{fmt(user.rCoins)}</span></p>
        <input type="number" min="1" autoFocus value={amount}
          onChange={e => { setAmount(e.target.value); setErr(''); }}
          onKeyDown={e => e.key === 'Enter' && handle()}
          placeholder="Enter amount…"
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${err ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-violet-300'}`} />
        {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handle} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${isAdd ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isAdd ? 'Add' : 'Deduct'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── WhatsApp Modal ──────────────────────────── */
const WhatsAppModal = ({ user, onConfirm, onCancel, loading }) => {
  const [num, setNum] = useState(user.whatsapp || '');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ marginTop: '70px' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Phone size={22} className="text-green-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 text-center mb-1">Update WhatsApp</h3>
        <p className="text-sm text-gray-500 text-center mb-4">@{user.username}</p>
        <input type="tel" autoFocus value={num} onChange={e => setNum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(num || '+8801703449001')}
          placeholder="+880 17..." className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition" />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={() => onConfirm(num || '+8801703449001')} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Pagination ──────────────────────────────── */
const Pagination = ({ page, totalPages, onChange, totalCount, pageSize }) => {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);
  const delta = 2;
  const pages = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) pages.push(i);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100">
      <p className="text-xs text-gray-400 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{start}–{end}</span> of <span className="font-medium text-gray-700">{totalCount.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {[
          { icon: ChevronsLeft,  action: () => onChange(1),          disabled: page === 1 },
          { icon: ChevronLeft,   action: () => onChange(page - 1),   disabled: page === 1 },
        ].map(({ icon: Icon, action, disabled }, i) => (
          <button key={i} onClick={action} disabled={disabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <Icon size={14} />
          </button>
        ))}
        {pages[0] > 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-1 text-gray-400 text-sm">…</span>}
        {[
          { icon: ChevronRight,  action: () => onChange(page + 1),   disabled: page === totalPages },
          { icon: ChevronsRight, action: () => onChange(totalPages), disabled: page === totalPages },
        ].map(({ icon: Icon, action, disabled }, i) => (
          <button key={i} onClick={action} disabled={disabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function ResellerManagement() {
  const [users,         setUsers]         = useState([]);
  const [resellerMap,   setResellerMap]   = useState({});
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(1);
  const [totalCount,    setTotalCount]    = useState(0);
  const [search,        setSearch]        = useState('');
  const [debouncedQ,    setDebouncedQ]    = useState('');
  const [statCounts,    setStatCounts]    = useState({ total: 0, reseller: 0 });
  const [toast,         setToast]         = useState(null);

  /* modals */
  const [coinModal,     setCoinModal]     = useState(null);
  const [resellerModal, setResellerModal] = useState(null);
  const [waModal,       setWaModal]       = useState(null);
  const [historyModal,  setHistoryModal]  = useState(null);
  const [waInput,       setWaInput]       = useState('');

  const searchRef = useRef();
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* debounce */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [search]);

  /* ── map _User parse object ── */
  const mapUser = useCallback((u, rMap) => {
    const av = u.get('avatar');
    let avatarUrl = null;
    if (av && typeof av.url === 'function') avatarUrl = av.url();
    else if (av?.url) avatarUrl = av.url;
    else if (typeof av === 'string') avatarUrl = av;

    const lc = u.get('live_cover');
    let liveCoverUrl = null;
    if (lc && typeof lc.url === 'function') liveCoverUrl = lc.url();
    else if (lc?.url) liveCoverUrl = lc.url;

    const rEntry = rMap[u.id];
    return {
      objectId:             u.id,
      uid:                  String(u.get('uid') || u.id),
      name:                 u.get('name')                    || '—',
      username:             u.get('username')                || 'anonymous',
      email:                u.get('email')                   || '—',
      firstName:            u.get('first_name')              || '—',
      lastName:             u.get('last_name')               || '—',
      gender:               u.get('gender')                  || '—',
      bio:                  u.get('bio')                     || '—',
      country:              u.get('country')                 || '—',
      countryCode:          u.get('country_code')            || '—',
      countryDialCode:      u.get('country_dial_code')       || '—',
      credit:               u.get('credit')                  || 0,
      diamonds:             u.get('diamonds')                || 0,
      rCoins:               u.get('reseller_coins')          || 0,
      isReseller:           !!(u.get('isreseller')),
      resellerHistory:      u.get('reseller_history')        || [],
      whatsapp:             u.get('reseller_whatsAppnumber') || rEntry?.whatsapp || '',
      tag:                  u.get('tag')                     || '',
      vipLevel:             u.get('vip_level')               ?? null,
      vipDuration:          u.get('vip_duration')            || null,
      agencyRole:           u.get('agency_role')             || '',
      userStateInApp:       u.get('user_state_in_app')       || '',
      totalRechargedCredits:u.get('total_recharged_credits') || 0,
      creditSent:           u.get('creditSent')              || 0,
      followers:            u.get('followers')               || [],
      following:            u.get('following')               || [],
      avatarUrl,
      liveCoverUrl,
      resellerObjId:        rEntry?.id || null,
      birthday:             u.get('birthday')?.iso           || null,
      lastOnline:           u.get('lastOnline')?.iso         || null,
      createdAt:            u.createdAt?.toISOString()       || null,
    };
  }, []);

  /* ── fetch reseller map ── */
  const fetchResellerMap = useCallback(async () => {
    try {
      const q = new Parse.Query('reseller');
      q.limit(2000);
      q.select('user_id', 'whatsapp_number');
      const res = await q.find({ useMasterKey: true });
      const map = {};
      res.forEach(r => {
        const uid = r.get('user_id');
        if (uid) map[uid] = { id: r.id, whatsapp: r.get('whatsapp_number') || '' };
      });
      setResellerMap(map);
      return map;
    } catch (e) { console.error(e); return {}; }
  }, []);

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const [total, reseller] = await Promise.all([
        new Parse.Query('_User').count({ useMasterKey: true }),
        new Parse.Query('reseller').count({ useMasterKey: true }),
      ]);
      setStatCounts({ total, reseller });
    } catch (e) { console.error(e); }
  }, []);

  /* ── fetch resellers page ── */
  const fetchPage = useCallback(async (pg, q, rMap) => {
    setLoading(true);
    try {
      const mk = { useMasterKey: true };
      const trimmed = q.trim();

      /* always show only resellers */
      const rq = new Parse.Query('reseller');
      rq.limit(2000);
      rq.select('user_id', 'whatsapp_number');
      const rRecs = await rq.find(mk);

      const waMap = {};
      rRecs.forEach(r => {
        const uid = r.get('user_id');
        if (uid) waMap[uid] = { id: r.id, whatsapp: r.get('whatsapp_number') || '' };
      });

      let userIds = rRecs.map(r => r.get('user_id')).filter(Boolean);
      if (!userIds.length) { setUsers([]); setTotalCount(0); setLoading(false); return; }

      const User = Parse.Object.extend('_User');
      const uq = new Parse.Query(User);
      uq.containedIn('objectId', userIds);

      if (trimmed) {
        const n = parseInt(trimmed);
        if (!isNaN(n)) uq.equalTo('uid', n);
        else uq.matches('name', trimmed, 'i');
      }

      uq.limit(1000);
      const batch = await uq.find(mk);
      setTotalCount(batch.length);

      const merged = { ...rMap, ...waMap };
      const mapped = batch.map(u => {
        const row = mapUser(u, merged);
        if (merged[u.id]) row.whatsapp = merged[u.id].whatsapp;
        return row;
      });
      setUsers(mapped);
    } catch (e) {
      console.error(e);
      showToast('Fetch failed: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [mapUser, showToast]);

  /* init */
  useEffect(() => {
    const init = async () => {
      const [rMap] = await Promise.all([fetchResellerMap(), fetchStats()]);
      fetchPage(1, '', rMap);
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchPage(page, debouncedQ, resellerMap);
  }, [page, debouncedQ]); // eslint-disable-line

  /* ── coin update ── */
  const confirmCoin = async (amount) => {
    const { user, type } = coinModal;
    const newVal = type === 'inc' ? user.rCoins + amount : Math.max(0, user.rCoins - amount);
    setActionLoading(user.objectId);
    setCoinModal(null);
    try {
      const obj = await new Parse.Query('_User').get(user.objectId, { useMasterKey: true });
      obj.set('reseller_coins', newVal);
      await obj.save(null, { useMasterKey: true });
      setUsers(list => list.map(u => u.objectId === user.objectId ? { ...u, rCoins: newVal } : u));
      showToast(`@${user.username}: ${type === 'inc' ? '+' : '-'}${fmt(amount)} → ${fmt(newVal)}`, type === 'inc' ? 'success' : 'info');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    finally { setActionLoading(null); }
  };

  /* ── toggle reseller ── */
  const confirmReseller = async () => {
    const user = resellerModal;
    setResellerModal(null);
    setActionLoading(user.objectId);
    try {
      if (user.isReseller) {
        const rObjId = resellerMap[user.objectId]?.id;
        if (rObjId) {
          const rObj = await new Parse.Query('reseller').get(rObjId, { useMasterKey: true });
          await rObj.destroy({ useMasterKey: true });
        } else {
          const fq = new Parse.Query('reseller'); fq.equalTo('user_id', user.objectId);
          const found = await fq.first({ useMasterKey: true });
          if (found) await found.destroy({ useMasterKey: true });
        }
        const uObj = await new Parse.Query('_User').get(user.objectId, { useMasterKey: true });
        uObj.set('isreseller', false);
        await uObj.save(null, { useMasterKey: true });
        const newMap = { ...resellerMap }; delete newMap[user.objectId];
        setResellerMap(newMap);
        setUsers(list => list.filter(u => u.objectId !== user.objectId));
        setTotalCount(c => Math.max(0, c - 1));
        showToast(`@${user.username} removed from resellers`, 'info');
      } else {
        const Reseller = Parse.Object.extend('reseller');
        const rec = new Reseller();
        rec.set('user_id', user.objectId);
        rec.set('whatsapp_number', waInput.trim() || '0000000000');
        const saved = await rec.save(null, { useMasterKey: true });
        const uObj = await new Parse.Query('_User').get(user.objectId, { useMasterKey: true });
        uObj.set('isreseller', true);
        await uObj.save(null, { useMasterKey: true });
        const newMap = { ...resellerMap, [user.objectId]: { id: saved.id, whatsapp: waInput.trim() } };
        setResellerMap(newMap);
        setUsers(list => list.map(u => u.objectId === user.objectId ? { ...u, isReseller: true, resellerObjId: saved.id } : u));
        showToast(`@${user.username} is now a Reseller ✓`, 'success');
      }
      fetchStats();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    finally { setActionLoading(null); }
  };

  /* ── whatsapp ── */
  const confirmWA = async (num) => {
    const user = waModal;
    setWaModal(null);
    setActionLoading(user.objectId);
    try {
      const rObjId = resellerMap[user.objectId]?.id;
      let rec;
      if (rObjId) {
        rec = await new Parse.Query('reseller').get(rObjId, { useMasterKey: true });
      } else {
        const fq = new Parse.Query('reseller'); fq.equalTo('user_id', user.objectId);
        rec = await fq.first({ useMasterKey: true });
        if (!rec) { const R = Parse.Object.extend('reseller'); rec = new R(); rec.set('user_id', user.objectId); }
      }
      rec.set('whatsapp_number', num);
      await rec.save(null, { useMasterKey: true });
      setUsers(list => list.map(u => u.objectId === user.objectId ? { ...u, whatsapp: num } : u));
      showToast('WhatsApp updated!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    finally { setActionLoading(null); }
  };

  /* ─── RENDER ──────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingTop: '70px' }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {coinModal && (
        <CoinModal user={coinModal.user} type={coinModal.type}
          onConfirm={confirmCoin} onCancel={() => setCoinModal(null)}
          loading={actionLoading === coinModal.user?.objectId} />
      )}
      {resellerModal && (
        <ConfirmModal
          title={resellerModal.isReseller ? 'Remove Reseller' : 'Make Reseller'}
          desc={resellerModal.isReseller
            ? `Remove @${resellerModal.username} from resellers? Their record will be deleted.`
            : `Make @${resellerModal.username} a reseller?`}
          extra={!resellerModal.isReseller && (
            <input type="text" value={waInput} onChange={e => setWaInput(e.target.value)}
              placeholder="WhatsApp number (optional)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition" />
          )}
          danger={resellerModal.isReseller}
          onConfirm={confirmReseller} onCancel={() => setResellerModal(null)}
          loading={actionLoading === resellerModal?.objectId} />
      )}
      {waModal && (
        <WhatsAppModal user={waModal}
          onConfirm={confirmWA} onCancel={() => setWaModal(null)}
          loading={actionLoading === waModal?.objectId} />
      )}
      {historyModal && (
        <HistoryModal user={historyModal} onClose={() => setHistoryModal(null)} />
      )}

      {/* ── Sticky Header ── */}
      <div className="bg-white border-b border-gray-100 fixed top-[70px] left-0 right-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900">Reseller Management</h1>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <span>Dashboard</span><span>/</span>
              <span className="text-gray-700 font-medium">Resellers</span>
            </nav>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={async () => { const m = await fetchResellerMap(); await fetchStats(); fetchPage(page, debouncedQ, m); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[57px]" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Resellers', val: statCounts.reseller,                   color: 'violet', icon: Star        },
            { label: 'Total Users',     val: statCounts.total,                       color: 'blue',   icon: Users       },
            { label: 'Showing Now',     val: users.length,                           color: 'emerald',icon: TrendingUp  },
            { label: 'Total R-Coins',   val: fmt(users.reduce((s,u) => s + u.rCoins, 0)), color: 'amber', icon: Gem    },
          ].map(s => {
            const c = {
              violet:  { bg: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', val: 'text-violet-700' },
              blue:    { bg: 'bg-sky-50 border-sky-100',       icon: 'bg-sky-100 text-sky-600',       val: 'text-sky-700'   },
              emerald: { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
              amber:   { bg: 'bg-amber-50 border-amber-100',   icon: 'bg-amber-100 text-amber-600',   val: 'text-amber-700' },
            }[s.color];
            return (
              <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${c.bg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                  <s.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider leading-tight">{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 truncate ${c.val}`}>{typeof s.val === 'number' ? s.val.toLocaleString() : s.val}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Search Bar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resellers by name or UID…"
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition"
            />
            {search && (
              <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
            {loading
              ? <><Loader2 size={13} className="animate-spin text-violet-500" /> Loading…</>
              : <span className="bg-gray-100 px-3 py-1.5 rounded-lg font-medium">{totalCount.toLocaleString()} resellers</span>
            }
          </div>
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  {['Object ID', 'Avatar', 'UID', 'Name / Username', 'Country', 'R-Coins', 'WhatsApp', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded" style={{ width: `${40 + (j * 13) % 45}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Star size={32} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No resellers found{search ? ` for "${search}"` : ''}.</p>
                    </td>
                  </tr>
                ) : users.map(user => {
                  const il = actionLoading === user.objectId;
                  const txnCount = user.resellerHistory?.length || 0;
                  return (
                    <tr key={user.objectId} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <code className="text-[11px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md font-mono">{user.objectId}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-violet-100" />
                          : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(user.username)}`}>{getInitials(user.name)}</div>
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-mono font-bold">#{user.uid}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900 whitespace-nowrap">{user.name}</p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{user.country} {user.countryDialCode !== '—' ? `(${user.countryDialCode})` : ''}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                          <Gem size={11} className="text-amber-500" />{fmt(user.rCoins)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">{user.whatsapp || '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* History */}
                          <button onClick={() => setHistoryModal(user)} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg hover:bg-violet-100 transition disabled:opacity-50 whitespace-nowrap">
                            <History size={11} /> History {txnCount > 0 && <span className="bg-violet-200 text-violet-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold ml-0.5">{txnCount}</span>}
                          </button>
                          {/* Add coins */}
                          <button onClick={() => setCoinModal({ user, type: 'inc' })} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition disabled:opacity-50">
                            + Add
                          </button>
                          {/* Deduct */}
                          <button onClick={() => setCoinModal({ user, type: 'dec' })} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                            − Deduct
                          </button>
                          {/* WA */}
                          <button onClick={() => setWaModal(user)} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition disabled:opacity-50">
                            <Phone size={10} /> WA
                          </button>
                          {/* Remove */}
                          <button onClick={() => { setWaInput(''); setResellerModal(user); }} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                            <UserMinus size={10} /> Remove
                          </button>
                          {il && <Loader2 size={14} className="animate-spin text-violet-400" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && users.length > 0 && totalCount > PAGE_SIZE && (
            <Pagination page={page} totalPages={Math.ceil(totalCount / PAGE_SIZE)} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
          )}
        </div>

        {/* ── Mobile Cards ── */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-12 bg-amber-50 rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 bg-gray-100 rounded-xl" />
                  <div className="h-9 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Star size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No resellers found.</p>
            </div>
          ) : users.map(user => {
            const il = actionLoading === user.objectId;
            const txnCount = user.resellerHistory?.length || 0;
            return (
              <div key={user.objectId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Card Top */}
                <div className="flex items-center gap-3 p-4 pb-3">
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-violet-100 shrink-0" />
                    : <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(user.username)}`}>{getInitials(user.name)}</div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <code className="text-[11px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-mono font-bold">#{user.uid}</code>
                      <span className="text-xs text-gray-400 truncate">@{user.username}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Star size={9} /> Reseller
                  </span>
                </div>

                {/* Object ID */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-y border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Object ID</span>
                  <code className="text-[11px] font-mono text-gray-500">{user.objectId}</code>
                </div>

                {/* R-Coins strip */}
                <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <Gem size={16} className="text-amber-500" />
                    <div>
                      <p className="text-[10px] text-amber-600 uppercase tracking-wide font-medium">R-Coins</p>
                      <p className="text-lg font-bold text-amber-700 leading-tight">{fmt(user.rCoins)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Phone size={11} />
                    <span className="font-mono">{user.whatsapp || '—'}</span>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-0 border-b border-gray-100">
                  <div className="px-4 py-2.5 border-r border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase">Country</p>
                    <p className="text-xs font-medium text-gray-700 truncate mt-0.5">{user.country} {user.countryDialCode !== '—' ? `(${user.countryDialCode})` : ''}</p>
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-gray-400 uppercase">Transactions</p>
                    <p className="text-xs font-bold text-violet-700 mt-0.5">{txnCount} txns</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  {/* History — full width */}
                  <button onClick={() => setHistoryModal(user)} disabled={il}
                    className="col-span-2 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 active:scale-95 transition disabled:opacity-50">
                    <History size={14} />
                    Reseller History
                    {txnCount > 0 && (
                      <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{txnCount}</span>
                    )}
                  </button>
                  {/* Add */}
                  <button onClick={() => setCoinModal({ user, type: 'inc' })} disabled={il}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 active:scale-95 transition disabled:opacity-50">
                    + Add Coins
                  </button>
                  {/* Deduct */}
                  <button onClick={() => setCoinModal({ user, type: 'dec' })} disabled={il}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 active:scale-95 transition disabled:opacity-50">
                    − Deduct
                  </button>
                  {/* WA */}
                  <button onClick={() => setWaModal(user)} disabled={il}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 active:scale-95 transition disabled:opacity-50">
                    <Phone size={12} /> WhatsApp
                  </button>
                  {/* Remove */}
                  <button onClick={() => { setWaInput(''); setResellerModal(user); }} disabled={il}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 active:scale-95 transition disabled:opacity-50">
                    <UserMinus size={12} /> Remove
                  </button>
                </div>
              </div>
            );
          })}

          {/* Mobile Pagination */}
          {!loading && users.length > 0 && totalCount > PAGE_SIZE && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Pagination page={page} totalPages={Math.ceil(totalCount / PAGE_SIZE)} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}