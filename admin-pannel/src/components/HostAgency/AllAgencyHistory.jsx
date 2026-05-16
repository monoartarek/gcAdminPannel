import React, { useState, useEffect, useCallback, useRef } from 'react';
import Parse from '../../parseConfig';
import {
  History, Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, X, Loader2, Shield, Hash,
  Gem, TrendingUp, Clock, Wallet, Building2, User,
  Mail, AtSign, Copy, Check, FileText, CreditCard,
  ArrowLeft, Video
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const PAGE_SIZE = 50;

/* ══════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════ */
const fmt = n => Number(n || 0).toLocaleString();

const Avatar = ({ name = '?' }) => {
  const initials = (name || '?').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700', 'bg-teal-100 text-teal-700',
  ];
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold shrink-0 ${palettes[(name || '?').charCodeAt(0) % palettes.length]}`}>
      {initials}
    </span>
  );
};

const Badge = ({ children, variant = 'default' }) => {
  const styles = {
    default: 'bg-gray-100 text-gray-600', blue: 'bg-sky-100 text-sky-700',
    green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700', rose: 'bg-rose-100 text-rose-700',
    teal: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
};

const typeVariant = (type) => {
  if (!type || type === 'null' || type === '—') return 'default';
  const t = type.toLowerCase();
  if (t.includes('video') || t.includes('live')) return 'blue';
  if (t.includes('audio')) return 'violet';
  if (t.includes('bonus')) return 'green';
  if (t.includes('with'))  return 'rose';
  return 'amber';
};

const typeColor = (type) => {
  if (!type || type === '—') return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  const t = type.toLowerCase();
  if (t.includes('video') || t.includes('live')) return { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     };
  if (t.includes('audio'))                        return { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  };
  if (t.includes('bonus'))                        return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (t.includes('with'))                         return { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    };
  return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
};

/* ══════════════════════════════════════════════
   SMALL SHARED COMPONENTS
══════════════════════════════════════════════ */
const StatCard = ({ icon: Icon, label, value, loading, color }) => {
  const colors = {
    blue:   { bg: 'bg-sky-50 border-sky-100',        icon: 'bg-sky-100 text-sky-600',       val: 'text-sky-700'     },
    green:  { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
    violet: { bg: 'bg-violet-50 border-violet-100',  icon: 'bg-violet-100 text-violet-600', val: 'text-violet-700'  },
    amber:  { bg: 'bg-amber-50 border-amber-100',    icon: 'bg-amber-100 text-amber-600',   val: 'text-amber-700'   },
    rose:   { bg: 'bg-rose-50 border-rose-100',      icon: 'bg-rose-100 text-rose-600',     val: 'text-rose-700'    },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-2xl border p-5 ${c.bg} flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}><Icon size={20} /></div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        {loading
          ? <div className="w-12 h-6 bg-gray-200 animate-pulse rounded mt-1" />
          : <p className={`text-2xl font-bold mt-0.5 ${c.val}`}>{value?.toLocaleString() ?? '—'}</p>
        }
      </div>
    </div>
  );
};

const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  const styles = { success: 'bg-emerald-600 text-white', error: 'bg-red-600 text-white', info: 'bg-gray-900 text-white' };
  return (
    <div className={`fixed top-5 right-5 z-[99] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${styles[type] || styles.info}`}
      style={{ animation: 'fadeUp .2s ease-out' }}>
      {type === 'success' && <Shield size={15} className="shrink-0" />}
      {type === 'error'   && <AlertTriangle size={15} className="shrink-0" />}
      {msg}
    </div>
  );
};

const ConfirmModal = ({ title, desc, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={22} className="text-amber-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 text-center mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center mb-6">{desc}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

const Pagination = ({ page, totalPages, onChange, totalCount, pageSize }) => {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);
  const delta = 2;
  const pages = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) pages.push(i);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100">
      <p className="text-xs text-gray-400 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{start}–{end}</span> of <span className="font-medium text-gray-700">{totalCount.toLocaleString()}</span> records
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <PgBtn onClick={() => onChange(1)}          disabled={page === 1}          icon={ChevronsLeft} />
        <PgBtn onClick={() => onChange(page - 1)}   disabled={page === 1}          icon={ChevronLeft} />
        {pages[0] > 1 && <span className="px-2 text-gray-400 text-sm">…</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-2 text-gray-400 text-sm">…</span>}
        <PgBtn onClick={() => onChange(page + 1)}   disabled={page === totalPages} icon={ChevronRight} />
        <PgBtn onClick={() => onChange(totalPages)} disabled={page === totalPages} icon={ChevronsRight} />
      </div>
    </div>
  );
};
const PgBtn = ({ onClick, disabled, icon: Icon }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
    <Icon size={14} />
  </button>
);

/* ── Mobile helpers ──────────────────────────── */
const MobileMetric = ({ icon: Icon, label, value, accent }) => {
  const accents = { emerald: 'text-emerald-600', violet: 'text-violet-600', rose: 'text-rose-600' };
  return (
    <div className="bg-gray-50 rounded-xl p-2.5">
      <div className="flex items-center gap-1 text-gray-400 mb-1">
        <Icon size={11} /><span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-bold text-sm ${accents[accent] || 'text-gray-800'}`}>{value ?? '—'}</p>
    </div>
  );
};
const FooterRow = ({ label, value, mono }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] text-gray-400">{label}</span>
    <span className={`text-[11px] font-medium text-gray-700 truncate max-w-[180px] ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  </div>
);

const HistoryCard = ({ row, onView }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Avatar name={row.name} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">{row.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <code className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">#{row.uid}</code>
          <Badge variant={typeVariant(row.type)}>{row.type || '—'}</Badge>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <MobileMetric icon={TrendingUp} label="Earning"  value={fmt(row.earning)}        accent="emerald" />
      <MobileMetric icon={Clock}      label="Duration" value={`${row.duration} min`} />
      <MobileMetric icon={Gem}        label="Bonus"    value={fmt(row.bonus)}          accent="violet" />
      <MobileMetric icon={Wallet}     label="Withdraw" value={fmt(row.withdrawAmount)} accent="rose" />
    </div>
    <div className="space-y-1.5 pt-1 border-t border-gray-50">
      <FooterRow label="Username"     value={row.username} />
      {row.email && row.email !== '—' && <FooterRow label="Email" value={row.email} />}
      <FooterRow label="Agency"       value={row.agencyName} />
      <FooterRow label="Agency Owner" value={row.agencyOwnerId} />
      <FooterRow label="Withdraw Type"value={row.withdrawType} />
      <FooterRow label="Object ID"    value={row.objectId} mono />
    </div>
    <button onClick={onView}
      className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold rounded-xl text-xs hover:bg-sky-600 hover:text-white transition active:scale-[0.98] border border-sky-100">
      View Details
    </button>
  </div>
);

/* ══════════════════════════════════════════════
   DETAIL DRAWER — shown in-page, no redirect
══════════════════════════════════════════════ */
const CopyBadge = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg text-[11px] font-mono transition-colors">
      <code className="truncate max-w-[160px]">{value}</code>
      {copied ? <Check size={10} className="text-emerald-500 shrink-0" /> : <Copy size={10} className="shrink-0 opacity-50" />}
    </button>
  );
};

const InfoRow = ({ icon: Icon, label, value, accent, copyable, mono }) => (
  <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0 gap-4">
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-gray-400" />
      </div>
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{label}</span>
    </div>
    <div className="text-right min-w-0">
      {copyable
        ? <CopyBadge value={value} />
        : <span className={`text-sm font-semibold break-all ${accent || 'text-gray-800'} ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
      }
    </div>
  </div>
);

const MetricPill = ({ icon: Icon, label, value, bg, iconCls, valCls }) => (
  <div className={`rounded-2xl p-3.5 ${bg} flex items-center gap-3`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}><Icon size={16} /></div>
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
      <p className={`text-lg font-bold mt-0.5 truncate ${valCls}`}>{value}</p>
    </div>
  </div>
);

const DetailSection = ({ icon: Icon, iconBg, iconColor, title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={15} className={iconColor} />
      </div>
      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
    </div>
    <div className="px-5 py-1">{children}</div>
  </div>
);

const DetailDrawer = ({ row, onClose }) => {
  const tc = typeColor(row.type);

  const exportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Agency History — Record Detail', 14, 18);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
      autoTable(doc, {
        head: [['Field', 'Value']],
        body: [
          ['Object ID',        row.objectId],
          ['Host UID',         `#${row.uid}`],
          ['Host Name',        row.name],
          ['Username',         `@${row.username}`],
          ['Email',            row.email || '—'],
          ['Agency Name',      row.agencyName],
          ['Agency Owner UID', row.agencyOwnerId],
          ['Board Type',       row.type],
          ['Earning',          fmt(row.earning)],
          ['Duration',         `${row.duration} min`],
          ['Bonus',            fmt(row.bonus)],
          ['Withdraw Amount',  fmt(row.withdrawAmount)],
          ['Withdraw Type',    row.withdrawType],
        ],
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [2, 132, 199], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 120 } },
        margin: { left: 14, right: 14 },
      });
      doc.save(`Record_Detail_${row.uid}_${Date.now()}.pdf`);
    } catch (err) {
      alert('PDF failed: ' + err.message);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer panel — slides in from right */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:max-w-xl bg-slate-50 z-50 flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: 'slideInRight .28s cubic-bezier(.22,1,.36,1) forwards' }}
      >
        {/* ── Drawer Header ── */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-5 py-4 flex items-center gap-3 shrink-0">
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-sm truncate">{row.name}</h2>
            <p className="text-sky-200 text-xs mt-0.5">@{row.username} · UID #{row.uid}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition">
              <FileText size={13} /> PDF
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Hero strip (type badge + email) ── */}
        <div className="bg-sky-600 px-5 pb-4 flex items-center gap-3 flex-wrap shrink-0">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${tc.bg} ${tc.text}`}>
            <span className={`w-2 h-2 rounded-full ${tc.dot}`} />
            {row.type || 'Unknown Type'}
          </div>
          {row.email && row.email !== '—' && (
            <span className="text-sky-100 text-xs flex items-center gap-1">
              <Mail size={11} />{row.email}
            </span>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Metric pills */}
            <div className="grid grid-cols-2 gap-3">
              <MetricPill icon={TrendingUp} label="Earning"   value={fmt(row.earning)}
                bg="bg-emerald-50 border border-emerald-100" iconCls="bg-emerald-100 text-emerald-600" valCls="text-emerald-700" />
              <MetricPill icon={Clock}      label="Duration"  value={`${row.duration} min`}
                bg="bg-sky-50 border border-sky-100" iconCls="bg-sky-100 text-sky-600" valCls="text-sky-700" />
              <MetricPill icon={Gem}        label="Bonus"     value={fmt(row.bonus)}
                bg="bg-violet-50 border border-violet-100" iconCls="bg-violet-100 text-violet-600" valCls="text-violet-700" />
              <MetricPill icon={Wallet}     label="Withdrawn" value={fmt(row.withdrawAmount)}
                bg="bg-rose-50 border border-rose-100" iconCls="bg-rose-100 text-rose-600" valCls="text-rose-700" />
            </div>

            {/* Host Info */}
            <DetailSection icon={User} iconBg="bg-sky-100" iconColor="text-sky-600" title="Host Information">
              <InfoRow icon={Hash}   label="UID"       value={`#${row.uid}`} mono />
              <InfoRow icon={User}   label="Name"      value={row.name} />
              <InfoRow icon={AtSign} label="Username"  value={`@${row.username}`} mono />
              <InfoRow icon={Mail}   label="Email"     value={row.email || '—'} />
              <InfoRow icon={Hash}   label="Object ID" value={row.objectId} copyable />
            </DetailSection>

            {/* Agency Info */}
            <DetailSection icon={Building2} iconBg="bg-violet-100" iconColor="text-violet-600" title="Agency Information">
              <InfoRow icon={Building2} label="Agency Name" value={row.agencyName} />
              <InfoRow icon={Hash}      label="Owner UID"   value={row.agencyOwnerId} mono />
              <InfoRow icon={Video}     label="Board Type"  value={row.type}
                accent={(() => {
                  const t = (row.type || '').toLowerCase();
                  if (t.includes('video') || t.includes('live')) return 'text-sky-600';
                  if (t.includes('audio')) return 'text-violet-600';
                  if (t.includes('bonus')) return 'text-emerald-600';
                  return 'text-amber-600';
                })()}
              />
            </DetailSection>

            {/* Earnings */}
            <DetailSection icon={TrendingUp} iconBg="bg-emerald-100" iconColor="text-emerald-600" title="Earnings Breakdown">
              <InfoRow icon={TrendingUp} label="Earning"  value={fmt(row.earning)}       accent="text-emerald-600" />
              <InfoRow icon={Clock}      label="Duration" value={`${row.duration} min`}  accent="text-sky-600" />
              <InfoRow icon={Gem}        label="Bonus"    value={fmt(row.bonus)}         accent="text-violet-600" />
            </DetailSection>

            {/* Withdrawal */}
            <DetailSection icon={Wallet} iconBg="bg-rose-100" iconColor="text-rose-600" title="Withdrawal Information">
              <InfoRow icon={Wallet}     label="Withdraw Amount" value={fmt(row.withdrawAmount)} accent="text-rose-600" />
              <InfoRow icon={CreditCard} label="Withdraw Type"   value={row.withdrawType || '—'} />
            </DetailSection>

          </div>
        </div>

        {/* ── Drawer Footer ── */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">Record · <span className="font-mono">{row.objectId}</span></p>
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            <X size={14} /> Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT — AgencyHistory
══════════════════════════════════════════════ */
const AgencyHistory = () => {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page,         setPage]         = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);
  const [search,       setSearch]       = useState('');
  const [debouncedQ,   setDebouncedQ]   = useState('');
  const [stats,        setStats]        = useState({ total: 0, totalEarning: 0, totalBonus: 0, totalWithdraw: 0 });
  const [toast,        setToast]        = useState(null);
  const [modal,        setModal]        = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [detailRow,    setDetailRow]    = useState(null); // ← in-page detail panel

  const searchRef = useRef();
  const showToast = (msg, type = 'info') => setToast({ msg, type });

  /* debounce */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [search]);

  /* search sub-query */
  const buildSearchQuery = useCallback((q) => {
    if (!q?.trim()) return null;
    const trimQ = q.trim();
    const uidNum = parseInt(trimQ, 10);
    const nameQ = new Parse.Query('_User');
    nameQ.matches('name', trimQ, 'i');
    if (!isNaN(uidNum)) {
      const uidQ = new Parse.Query('_User'); uidQ.equalTo('uid', uidNum);
      return Parse.Query.or(nameQ, uidQ);
    }
    return nameQ;
  }, []);

  /* map row */
  const mapRow = useCallback(async (obj) => {
    const hostId  = obj.get?.('host_id');
    const agentId = obj.get?.('agency_id');
    let uid = '—', name = 'Unknown', username = '—', email = '—';
    if (hostId) {
      try {
        const hq = new Parse.Query('_User');
        hq.equalTo('objectId', hostId);
        const host = await hq.first({ useMasterKey: true });
        if (host) {
          uid      = host.get?.('uid')      ?? '—';
          name     = host.get?.('name')     ?? 'Unknown';
          username = host.get?.('username') ?? '—';
          email    = host.get?.('email')    ?? '—';
        }
      } catch (_) {}
    }
    let agencyName = '—', agencyOwnerId = '—';
    if (agentId) {
      try {
        const aq = new Parse.Query('_User');
        aq.equalTo('objectId', agentId);
        const agent = await aq.first({ useMasterKey: true });
        if (agent) {
          agencyName    = agent.get?.('agency_name') ?? '—';
          agencyOwnerId = agent.get?.('uid')         ?? '—';
        }
      } catch (_) {}
    }
    return {
      objectId: obj.id || obj.getObjectId?.() || '—',
      uid, name, username, email, agencyName, agencyOwnerId,
      type:           obj.get?.('type')            ?? '—',
      earning:        obj.get?.('earning')          ?? 0,
      duration:       obj.get?.('duration')         ?? 0,
      bonus:          obj.get?.('bonus')            ?? 0,
      withdrawAmount: obj.get?.('withdraw_amount')  ?? 0,
      withdrawType:   obj.get?.('withdraw_type')    ?? '—',
      hostId, agentId,
    };
  }, []);

  /* fetch page */
  const fetchPage = useCallback(async (pg, q) => {
    setLoading(true);
    try {
      const skip = (pg - 1) * PAGE_SIZE;
      const buildBase = () => {
        const qry = new Parse.Query('AgencyHistory');
        qry.descending('createdAt');
        const sub = buildSearchQuery(q);
        if (sub) qry.matchesKeyInQuery('host_id', 'objectId', sub);
        return qry;
      };
      const countQ = buildBase(); const dataQ = buildBase();
      dataQ.limit(PAGE_SIZE); dataQ.skip(skip);
      const [count, results] = await Promise.all([
        countQ.count({ useMasterKey: true }),
        dataQ.find({ useMasterKey: true }),
      ]);
      setTotalCount(count ?? 0);
      setRows(await Promise.all(results.map(mapRow)));
    } catch (e) {
      console.error('fetchPage error:', e);
      showToast('Failed to load: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [buildSearchQuery, mapRow]);

  /* fetch stats */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const q = new Parse.Query('AgencyHistory');
      q.limit(5000);
      const all = await q.find({ useMasterKey: true });
      let totalEarning = 0, totalBonus = 0, totalWithdraw = 0;
      all.forEach(obj => {
        totalEarning  += obj.get?.('earning')         ?? 0;
        totalBonus    += obj.get?.('bonus')           ?? 0;
        totalWithdraw += obj.get?.('withdraw_amount') ?? 0;
      });
      setStats({ total: all.length, totalEarning, totalBonus, totalWithdraw });
    } catch (e) { console.error('fetchStats error:', e); }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPage(page, debouncedQ); }, [fetchPage, page, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* reset earnings */
  const doReset = async () => {
    setModalLoading(true);
    try {
      const result = await Parse.Cloud.run('resetEarningsAndDelete', {});
      if (result?.success) {
        showToast('Earnings reset!', 'success');
        fetchPage(1, debouncedQ); fetchStats();
      } else {
        showToast('Error: ' + (result?.error || 'Unknown'), 'error');
      }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    finally { setModalLoading(false); setModal(null); }
  };

  /* export PDF (list) */
  const exportPDF = async () => {
    showToast('Generating PDF…', 'info');
    try {
      const q = new Parse.Query('AgencyHistory');
      q.descending('createdAt'); q.limit(100);
      const sub = buildSearchQuery(debouncedQ);
      if (sub) q.matchesKeyInQuery('host_id', 'objectId', sub);
      const all = await q.find({ useMasterKey: true });
      const mapped = await Promise.all(all.map(mapRow));
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16); doc.text('Agency History Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}  |  ${mapped.length} records`, 14, 23);
      autoTable(doc, {
        head: [['Object ID', 'UID', 'Name', 'Username', 'Email', 'Agency', 'Owner UID', 'Type', 'Earning', 'Duration', 'Bonus', 'Withdraw Amt', 'Withdraw Type']],
        body: mapped.map(r => [
          r.objectId, r.uid, r.name, r.username, r.email,
          r.agencyName, r.agencyOwnerId, r.type,
          r.earning, `${r.duration} min`, r.bonus, r.withdrawAmount, r.withdrawType,
        ]),
        startY: 28, theme: 'striped',
        headStyles: { fillColor: [2, 132, 199] },
        styles: { fontSize: 6.5 },
      });
      doc.save('Agency_History_Report.pdf');
      showToast('PDF exported!', 'success');
    } catch (e) { showToast('PDF failed: ' + e.message, 'error'); }
  };

  /* initial loading screen */
  if (loading && page === 1 && rows.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading agency history…</p>
      </div>
    </div>
  );

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Confirm Modal */}
      {modal?.type === 'reset' && (
        <ConfirmModal
          title="Reset All Earnings?"
          desc="This will permanently reset all earnings data. This cannot be undone."
          onConfirm={doReset} onCancel={() => setModal(null)} loading={modalLoading}
        />
      )}

      {/* Detail Drawer — in-page, no redirect */}
      {detailRow && (
        <DetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />
      )}

      {/* ── Sticky Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight">Agency History</h1>
              <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <span>Users</span><span>/</span>
                <span className="text-gray-700 font-medium">Agency History</span>
              </nav>
            </div>
            <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
              <button onClick={() => setModal({ type: 'reset' })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-all active:scale-95">
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Reset Earnings</span>
              </button>
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-all active:scale-95">
                <Download size={14} />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={History}    label="Total Records"   value={stats.total}         loading={statsLoading} color="blue"   />
          <StatCard icon={TrendingUp} label="Total Earnings"  value={stats.totalEarning}  loading={statsLoading} color="green"  />
          <StatCard icon={Gem}        label="Total Bonus"     value={stats.totalBonus}    loading={statsLoading} color="violet" />
          <StatCard icon={Wallet}     label="Total Withdrawn" value={stats.totalWithdraw} loading={statsLoading} color="rose"   />
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by host name or UID…"
              className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition"
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
              ? <><Loader2 size={13} className="animate-spin text-sky-500" /> Loading…</>
              : <>{totalCount.toLocaleString()} results • Page {page}/{totalPages}</>
            }
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  {[
                    ['Object ID', ''], ['#', 'w-10'], ['UID', ''], ['Name', ''],
                    ['Username', ''], ['Email', ''], ['Agency Name', ''],
                    ['Owner UID', ''], ['Board Type', ''], ['Earning', 'text-right'],
                    ['Duration', 'text-right'], ['Bonus', 'text-right'],
                    ['Withdraw Amt', 'text-right'], ['Withdraw Type', ''],
                    ['Details', 'text-center'],
                  ].map(([h, cls]) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${cls}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 15 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-gray-100 rounded" style={{ width: `${40 + (j * 11) % 45}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-5 py-16 text-center">
                      <History size={32} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No records found{search ? ` for "${search}"` : ''}.</p>
                    </td>
                  </tr>
                ) : rows.map((row, idx) => (
                  <tr key={row.objectId + idx} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <code className="text-[11px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md font-mono tracking-tight">{row.objectId}</code>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-mono">#{row.uid}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.name} />
                        <span className="font-medium text-gray-900 whitespace-nowrap">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{row.username}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      <span className="truncate max-w-[140px] block">{row.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5"><Badge variant="blue">{row.agencyName}</Badge></td>
                    <td className="px-4 py-3.5">
                      <code className="text-xs text-gray-500 font-mono">{row.agencyOwnerId}</code>
                    </td>
                    <td className="px-4 py-3.5"><Badge variant={typeVariant(row.type)}>{row.type}</Badge></td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-emerald-700">{Number(row.earning).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 whitespace-nowrap">{row.duration} min</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-violet-700">
                        <Gem size={11} className="text-violet-400" />{Number(row.bonus).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-rose-600">{Number(row.withdrawAmount).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={row.withdrawType !== '—' ? 'teal' : 'default'}>{row.withdrawType}</Badge>
                    </td>
                    {/* ── View Details button — opens drawer in-page ── */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setDetailRow(row)}
                        className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-semibold hover:bg-sky-600 hover:text-white transition-all active:scale-95 whitespace-nowrap border border-sky-100"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && rows.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-14 bg-gray-100 rounded-xl" />)}
                </div>
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <History size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No records found{search ? ` for "${search}"` : ''}.</p>
            </div>
          ) : (
            rows.map((row, idx) => (
              <HistoryCard key={row.objectId + idx} row={row} onView={() => setDetailRow(row)} />
            ))
          )}
          {!loading && rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeUp      { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight{ from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  );
};

export default AgencyHistory;