import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Parse from '../../parseConfig';
import {
  Users, Search, X, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Building2, Gem, User, Clock, Printer,
  FileText, Table, FileSpreadsheet, Check,
  AlertTriangle, Pencil, ArrowLeft, TrendingUp,
  Hash, ChevronsUpDown, ChevronUp, ChevronDown,
  Mail, Shield, Eye, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ══════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════ */
const fmt   = n => Number(n || 0).toLocaleString();
const fmtDur = (days = 0, mins = 0) => `${days} Days ${mins} Min`;

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',   'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700', 'bg-pink-100 text-pink-700',
];
const avatarColor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const getInitials = (name = '?') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ── Sort icon ── */
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp   size={12} className="text-blue-500 ml-1 shrink-0" />
    : <ChevronDown size={12} className="text-blue-500 ml-1 shrink-0" />;
};

/* ── Toast ── */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed top-5 right-5 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium
      ${type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}
      style={{ animation: 'fadeUp .2s ease-out' }}>
      {type === 'error' ? <AlertTriangle size={14} /> : <Check size={14} />}
      {msg}
    </div>
  );
};

/* ── Export Buttons ── */
const ExportBtn = ({ icon: Icon, label, color, onClick }) => {
  const colors = {
    gray:  'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
    red:   'bg-red-50   text-red-600   hover:bg-red-100  border-red-200',
    green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    teal:  'bg-teal-50  text-teal-700  hover:bg-teal-100  border-teal-200',
  };
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 ${colors[color]}`}>
      <Icon size={13} />{label}
    </button>
  );
};

/* ── Pg Button ── */
const PgBtn = ({ label, icon: Icon, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="flex items-center gap-1 px-3 h-8 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium">
    {Icon && <Icon size={13} />}{label}
  </button>
);

/* ══════════════════════════════════════════════
   FULL-PAGE OVERLAY — Agent + All Hosts
   Appears on top of the list, fills entire screen
══════════════════════════════════════════════ */
const FullPageOverlay = ({ agent, members, membersLoading, onClose, showToast }) => {
  const [search,    setSearch]    = useState('');
  const [pageSize,  setPageSize]  = useState(25);
  const [page,      setPage]      = useState(1);
  const [sortCol,   setSortCol]   = useState('createdAt');
  const [sortDir,   setSortDir]   = useState('desc');
  const [editName,  setEditName]  = useState(false);
  const [agencyName,setAgencyName]= useState(agent.get('agency_name') || '');
  const [removing,  setRemoving]  = useState(null);

  /* close on Escape */
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  /* prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const totalHosts   = members.length;
  const totalEarning = useMemo(() => {
    const h = members.reduce((s, m) => s + (m.get('host')?.get('diamonds') || 0), 0);
    return h + (agent.get('diamonds') || 0);
  }, [members, agent]);

  /* filter */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m => {
      const h = m.get('host');
      return String(h?.get('uid') || '').includes(q) || (h?.get('name') || '').toLowerCase().includes(q);
    });
  }, [members, search]);

  /* sort */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ha = a.get('host'), hb = b.get('host');
      let av, bv;
      if      (sortCol === 'uid')      { av = ha?.get('uid') || 0;    bv = hb?.get('uid') || 0; }
      else if (sortCol === 'name')     { av = ha?.get('name') || '';   bv = hb?.get('name') || ''; }
      else if (sortCol === 'liveDur')  { av = (a.get('livestream_duration_day')||0)*1440+(a.get('livestream_duration_minute')||0); bv = (b.get('livestream_duration_day')||0)*1440+(b.get('livestream_duration_minute')||0); }
      else if (sortCol === 'audioDur') { av = (a.get('audio_duration_day')||0)*1440+(a.get('audio_duration_minute')||0); bv = (b.get('audio_duration_day')||0)*1440+(b.get('audio_duration_minute')||0); }
      else if (sortCol === 'diamonds') { av = ha?.get('diamonds') || 0; bv = hb?.get('diamonds') || 0; }
      else if (sortCol === 'createdAt'){ av = a.get('createdAt') || 0;  bv = b.get('createdAt') || 0; }
      else return 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* save name */
  const saveName = async () => {
    try {
      agent.set('agency_name', agencyName.trim());
      await agent.save(null, { useMasterKey: true });
      showToast('Agency name updated!');
      setEditName(false);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  /* remove host */
  const doRemoveHost = async (hostId, hostUid) => {
    setRemoving(hostId);
    try {
      const hq = new Parse.Query('_User');
      const h  = await hq.get(hostId, { useMasterKey: true });
      h.set('agency_role', ''); h.set('my_agent_id', '');
      await h.save(null, { useMasterKey: true });
      showToast(`Host #${hostUid} removed!`);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    finally { setRemoving(null); }
  };

  /* remove agency */
  const removeAgency = async () => {
    if (!window.confirm('Remove this agency and unlink all hosts?')) return;
    try {
      agent.set('agency_name', ''); agent.set('my_agent_id', ''); agent.set('agency_role', '');
      await agent.save(null, { useMasterKey: true });
      showToast('Agency removed!');
      onClose();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  /* PDF */
  const exportPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text(`Agency Report: ${agent.get('agency_name') || '—'}`, 14, 16);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
      doc.text(`UID: ${agent.get('uid')}  |  Hosts: ${totalHosts}  |  Total Earning: ${fmt(totalEarning)}  |  ${new Date().toLocaleString()}`, 14, 23);
      autoTable(doc, {
        head: [['Host UID','Host Name','Live Duration','Audio Duration','Diamonds','Created At']],
        body: sorted.map(m => [
          m.get('host')?.get('uid') || '—',
          m.get('host')?.get('name') || '—',
          fmtDur(m.get('livestream_duration_day'), m.get('livestream_duration_minute')),
          fmtDur(m.get('audio_duration_day'), m.get('audio_duration_minute')),
          m.get('host')?.get('diamonds') || 0,
          m.get('createdAt')?.toLocaleString() || '—',
        ]),
        startY: 28, theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8.5 },
      });
      doc.save(`Agency_${agent.get('uid')}_Report.pdf`);
      showToast('PDF exported!');
    } catch (e) { showToast('PDF failed: ' + e.message, 'error'); }
  };

  const exportCSV = () => {
    const rows = sorted.map(m => [
      m.get('host')?.get('uid') || '',
      `"${m.get('host')?.get('name') || ''}"`,
      fmtDur(m.get('livestream_duration_day'), m.get('livestream_duration_minute')),
      fmtDur(m.get('audio_duration_day'), m.get('audio_duration_minute')),
      m.get('host')?.get('diamonds') || 0,
      m.get('createdAt')?.toLocaleString() || '',
    ]);
    const csv = [['Host UID','Host Name','Live Duration','Audio Duration','Diamonds','Created At'], ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `Agency_${agent.get('uid')}_Hosts.csv`; a.click();
    showToast('CSV exported!');
  };

  const agentName    = agent.get('name')        || '—';
  const agentUser    = agent.get('username')     || '—';
  const agentEmail   = agent.get('email')        || '—';
  const agentFirst   = agent.get('first_name')   || '—';
  const agentDiam    = agent.get('diamonds')     || 0;
  const agentUid     = agent.get('uid');
  const av           = agent.get('avatar');
  let   avatarUrl    = null;
  if (av && typeof av.url === 'function') avatarUrl = av.url();
  else if (av?.url) avatarUrl = av.url;

  return (
    /* Full-screen overlay — fixed, covers everything, z-50 */
    <div
      className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto"
      style={{ animation: 'overlayIn .25s ease-out forwards' }}
    >
      {/* ── Sticky Top Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3.5 flex items-center gap-3">
          {/* Back button */}
          <button onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition active:scale-95 shrink-0">
            <ArrowLeft size={15} /> Back to Agencies
          </button>

          {/* Breadcrumb */}
          <nav className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 min-w-0">
            <span>Users</span><span>/</span>
            <span>Agents</span><span>/</span>
            <span className="text-gray-800 font-semibold truncate">{agent.get('agency_name') || 'Agent Detail'}</span>
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition active:scale-95">
              <FileText size={13} /> PDF
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 border border-teal-200 text-teal-600 rounded-xl text-xs font-semibold hover:bg-teal-100 transition active:scale-95">
              <Table size={13} /> CSV
            </button>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* ── Agent Profile Banner ── */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, white 0%, transparent 55%)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {avatarUrl
              ? <img src={avatarUrl} alt={agentName} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shrink-0" />
              : <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 bg-white/20 border-2 border-white/30 text-white`}>
                  {getInitials(agentName)}
                </div>
            }
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black truncate">{agentName}</h1>
              <p className="text-blue-200 mt-0.5">@{agentUser} · UID <span className="font-bold text-white">#{agentUid}</span></p>
              {agentEmail !== '—' && <p className="text-blue-100 text-sm mt-1">{agentEmail}</p>}
            </div>
            <div className="shrink-0 flex flex-col sm:items-end gap-2">
              <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 px-3 py-1.5 rounded-full text-sm font-semibold">
                <Building2 size={14} /> {agent.get('agency_name') || 'No Agency Name'}
              </div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-400/20 border border-emerald-300/30 px-3 py-1.5 rounded-full text-sm font-semibold text-emerald-100">
                <Gem size={14} /> {fmt(agentDiam)} Diamonds
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Row: Agent Info Card + Stat Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Agent Info */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
              <User size={18} className="text-blue-500" />
              <h2 className="font-bold text-blue-600 text-base">Agent Info</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                {/* Left */}
                <div className="space-y-4">
                  <InfoLine label="UID:"      value={agentUid} />
                  <InfoLine label="Username:" value={`@${agentUser}`} />
                  <InfoLine label="Email:"    value={agentEmail} />
                </div>
                {/* Right */}
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Agency Name:</span>
                    {editName ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input autoFocus value={agencyName}
                          onChange={e => setAgencyName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false); }}
                          className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <button onClick={saveName} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"><Check size={13} /></button>
                        <button onClick={() => { setEditName(false); setAgencyName(agent.get('agency_name') || ''); }}
                          className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"><X size={13} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-800">{agent.get('agency_name') || '—'}</span>
                        <button onClick={() => setEditName(true)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                          <Pencil size={10} /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <InfoLine label="First Name:"     value={agentFirst} />
                  <InfoLine label="Agent Diamonds:" value={fmt(agentDiam)} accent="text-emerald-600 font-bold" />
                </div>
              </div>
              {/* Remove Agency */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <button onClick={removeAgency}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition active:scale-95">
                  <X size={15} /> Remove Agency
                </button>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="flex flex-col gap-4">
            <StatBox label="Total Hosts"         value={totalHosts}         accent="border-l-emerald-500" bg="from-emerald-50 to-white" />
            <StatBox label="Total Agency Earning" value={fmt(totalEarning)}  accent="border-l-cyan-500"    bg="from-cyan-50 to-white" />
          </div>
        </div>

        {/* ── Hosts History Table ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
            <Clock size={18} className="text-blue-500" />
            <h2 className="font-bold text-blue-600 text-base">Hosts History</h2>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 flex-wrap">
              <ExportBtn icon={Printer}         label="Print"  color="gray"  onClick={() => window.print()} />
              <ExportBtn icon={FileText}        label="PDF"    color="red"   onClick={exportPDF} />
              <ExportBtn icon={FileSpreadsheet} label="Excel"  color="green" onClick={exportCSV} />
              <ExportBtn icon={Table}           label="CSV"    color="teal"  onClick={exportCSV} />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Show</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  {[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-44" />
              </div>
            </div>
          </div>

          {/* Table */}
          {membersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading hosts…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { label: 'Host UID',       col: 'uid'       },
                      { label: 'Host Name',      col: 'name'      },
                      { label: 'Live Duration',  col: 'liveDur'   },
                      { label: 'Audio Duration', col: 'audioDur'  },
                      { label: 'Diamonds',       col: 'diamonds'  },
                      { label: 'Created At',     col: 'createdAt' },
                      { label: 'Action',         col: null        },
                    ].map(({ label, col }) => (
                      <th key={label} onClick={() => col && toggleSort(col)}
                        className={`px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap select-none ${col ? 'cursor-pointer hover:bg-gray-100 transition' : ''}`}>
                        <div className="flex items-center">
                          {label}
                          {col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">
                      {search ? `No hosts match "${search}"` : 'No host history found.'}
                    </td></tr>
                  ) : paginated.map(m => {
                    const h    = m.get('host');
                    const hId  = h?.id;
                    const hUid = h?.get('uid');
                    const hNm  = h?.get('name') || 'N/A';
                    const hDm  = h?.get('diamonds') || 0;
                    const lD   = m.get('livestream_duration_day')   || 0;
                    const lM   = m.get('livestream_duration_minute') || 0;
                    const aD   = m.get('audio_duration_day')   || 0;
                    const aM   = m.get('audio_duration_minute') || 0;
                    const ca   = m.get('createdAt');
                    return (
                      <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-gray-700">{hUid}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-800">{hNm}</td>
                        <td className="px-5 py-3.5 text-gray-600">{fmtDur(lD, lM)}</td>
                        <td className="px-5 py-3.5 text-gray-600">{fmtDur(aD, aM)}</td>
                        <td className="px-5 py-3.5 font-semibold text-emerald-700">{fmt(hDm)}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {ca ? ca.toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).replace(',',' ') : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => doRemoveHost(hId, hUid)} disabled={removing === hId}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-60 whitespace-nowrap">
                            {removing === hId
                              ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <X size={12} />}
                            Remove Host
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!membersLoading && sorted.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/40">
              <p className="text-sm text-gray-500">
                Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize, sorted.length)} of {sorted.length} entries
              </p>
              <div className="flex items-center gap-1.5">
                <PgBtn label="Previous" onClick={() => setPage(p => Math.max(1, p-1))}         disabled={page===1} />
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p===page ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  );
                })}
                <PgBtn label="Next"     onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom back button */}
        <div className="flex justify-center pb-6">
          <button onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-medium hover:bg-gray-50 transition shadow-sm">
            <ArrowLeft size={15} /> Back to Agencies List
          </button>
        </div>
      </div>

      <style>{`
        @keyframes overlayIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};
/* ══════════════════════════════════════════════
   MAIN — AGENCIES LIST PAGE
══════════════════════════════════════════════ */
export default function AgenciesList() {
  const [agents,        setAgents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(1);
  const [totalCount,    setTotalCount]    = useState(0);
  const [search,        setSearch]        = useState('');
  const [debouncedQ,    setDebouncedQ]    = useState('');
  const [pageSize,      setPageSize]      = useState(25);
  const [toast,         setToast]         = useState(null);
  const [sortCol,       setSortCol]       = useState('uid');
  const [sortDir,       setSortDir]       = useState('asc');

  /* drawer state */
  const [selectedAgent,  setSelectedAgent]  = useState(null);
  const [drawerMembers,  setDrawerMembers]  = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

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

  /* fetch agents */
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const buildQ = () => {
        const q = new Parse.Query('_User');
        q.equalTo('agency_role', 'agent');
        if (debouncedQ.trim()) {
          const n = parseInt(debouncedQ.trim());
          if (!isNaN(n)) q.equalTo('uid', n);
          else q.matches('name', debouncedQ.trim(), 'i');
        }
        return q;
      };
      const dq = buildQ(); const cq = buildQ();
      dq.descending('createdAt');
      dq.limit(pageSize);
      dq.skip((page - 1) * pageSize);
      dq.select(['uid', 'name', 'username', 'email', 'agency_name', 'first_name', 'diamonds', 'avatar', 'createdAt']);

      const [results, count] = await Promise.all([
        dq.find({ useMasterKey: true }),
        cq.count({ useMasterKey: true }),
      ]);

      setAgents(results);
      setTotalCount(count);
    } catch (e) {
      showToast('Failed to load: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQ, showToast]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* sort agents client-side (already paged from server) */
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      let av, bv;
      if      (sortCol === 'uid')         { av = a.get('uid') || 0;          bv = b.get('uid') || 0; }
      else if (sortCol === 'name')        { av = a.get('name') || '';         bv = b.get('name') || ''; }
      else if (sortCol === 'agencyName')  { av = a.get('agency_name') || '';  bv = b.get('agency_name') || ''; }
      else if (sortCol === 'diamonds')    { av = a.get('diamonds') || 0;      bv = b.get('diamonds') || 0; }
      else return 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [agents, sortCol, sortDir]);

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  /* open drawer: fetch this agent's members */
  const openDrawer = async (agentObj) => {
    setSelectedAgent(agentObj);
    setDrawerMembers([]);
    setMembersLoading(true);
    try {
      const mq = new Parse.Query('AgencyMember');
      mq.equalTo('agent', agentObj);
      mq.include('host');
      mq.descending('createdAt');
      mq.limit(2500);
      const res = await mq.find({ useMasterKey: true });
      setDrawerMembers(res);
    } catch (e) { showToast('Failed to load hosts: ' + e.message, 'error'); }
    finally { setMembersLoading(false); }
  };

  const closeDrawer = () => {
    setSelectedAgent(null);
    setDrawerMembers([]);
    fetchAgents(); // refresh list after possible changes
  };

  /* ══ RENDER ══ */
  return (
    <div className="min-h-screen bg-gray-50">

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {selectedAgent && (
        <FullPageOverlay
          agent={selectedAgent}
          members={drawerMembers}
          membersLoading={membersLoading}
          onClose={closeDrawer}
          showToast={showToast}
        />
      )}

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 size={20} className="text-blue-500" /> Agencies
            </h1>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <span>Users</span><span>/</span>
              <span className="text-gray-700 font-medium">All Agents</span>
            </nav>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <button onClick={fetchAgents} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 active:scale-95">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* ── Summary Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MiniStat icon={Building2} label="Total Agencies" value={totalCount} color="blue" />
          <MiniStat icon={Users}     label="On This Page"   value={agents.length} color="emerald" />
          <MiniStat icon={Hash}      label="Total Pages"    value={totalPages}   color="violet" />
        </div>

        {/* ── Main Table Card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                {[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or UID…"
                className="pl-9 pr-9 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 focus:bg-white transition w-52"
              />
              {search && (
                <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    { label: '#',            col: null },
                    { label: 'Agent',        col: 'name' },
                    { label: 'UID',          col: 'uid' },
                    { label: 'Agency Name',  col: 'agencyName' },
                    { label: 'Email',        col: null },
                    { label: 'First Name',   col: null },
                    { label: 'Diamonds',     col: 'diamonds' },
                    { label: 'Joined',       col: null },
                    { label: 'Action',       col: null },
                  ].map(({ label, col }) => (
                    <th key={label} onClick={() => col && toggleSort(col)}
                      className={`px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap select-none ${col ? 'cursor-pointer hover:bg-gray-100 transition' : ''}`}>
                      <div className="flex items-center">
                        {label}
                        {col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded" style={{ width: `${45 + (j * 11) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <Building2 size={32} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No agencies found{search ? ` for "${search}"` : ''}.</p>
                    </td>
                  </tr>
                ) : sortedAgents.map((agent, idx) => {
                  const av = agent.get('avatar');
                  let avatarUrl = null;
                  if (av && typeof av.url === 'function') avatarUrl = av.url();
                  else if (av?.url) avatarUrl = av.url;

                  const name       = agent.get('name')         || '—';
                  const username   = agent.get('username')     || '—';
                  const agUid      = agent.get('uid');
                  const agName     = agent.get('agency_name')  || '—';
                  const email      = agent.get('email')        || '—';
                  const firstName  = agent.get('first_name')   || '—';
                  const diamonds   = agent.get('diamonds')     || 0;
                  const createdAt  = agent.get('createdAt');

                  return (
                    <tr key={agent.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* # */}
                      <td className="px-5 py-4 text-xs text-gray-400 font-mono">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      {/* Agent */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl
                            ? <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover border-2 border-blue-100 shrink-0" />
                            : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(username)}`}>{getInitials(name)}</div>
                          }
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 whitespace-nowrap truncate">{name}</p>
                            <p className="text-xs text-gray-400">@{username}</p>
                          </div>
                        </div>
                      </td>
                      {/* UID */}
                      <td className="px-5 py-4">
                        <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-mono font-bold">{agUid}</code>
                      </td>
                      {/* Agency Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-gray-400 shrink-0" />
                          <span className="text-gray-800 font-medium truncate max-w-[140px]">{agName}</span>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-5 py-4 text-gray-500 text-xs truncate max-w-[160px]">{email}</td>
                      {/* First Name */}
                      <td className="px-5 py-4 text-gray-600 text-sm">{firstName}</td>
                      {/* Diamonds */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <Gem size={12} className="text-emerald-400" />{fmt(diamonds)}
                        </span>
                      </td>
                      {/* Joined */}
                      <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {createdAt?.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) || '—'}
                      </td>
                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openDrawer(agent)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition active:scale-95 whitespace-nowrap shadow-sm shadow-blue-200"
                        >
                          <Eye size={13} /> View Info
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer pagination */}
          {!loading && agents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/40">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-1.5">
                <PgBtn label="Previous" onClick={() => setPage(p => Math.max(1, p - 1))}       disabled={page === 1} />
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1
                          : page <= 3 ? i + 1
                          : page >= totalPages - 2 ? totalPages - 4 + i
                          : page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  );
                })}
                <PgBtn label="Next"     onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp      { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight{ from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  );
}

/* ── Shared tiny components ── */
const InfoLine = ({ label, value, accent }) => (
  <div className="flex flex-wrap items-baseline gap-2">
    <span className="text-sm font-semibold text-gray-700 shrink-0">{label}</span>
    <span className={`text-sm ${accent || 'text-gray-800'}`}>{value}</span>
  </div>
);

const StatBox = ({ label, value, accent, bg }) => (
  <div className={`flex-1 bg-gradient-to-r ${bg} rounded-2xl border-l-4 ${accent} border border-gray-200 shadow-sm px-6 py-5`}>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
    <p className="text-4xl font-black text-gray-800">{value}</p>
  </div>
);

const MiniStat = ({ icon: Icon, label, value, color }) => {
  const c = {
    blue:    { bg: 'bg-blue-50 border-blue-100',    icon: 'bg-blue-100 text-blue-600',    val: 'text-blue-700'    },
    emerald: { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
    violet:  { bg: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', val: 'text-violet-700'  },
  }[color] || {};
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${c.bg}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}><Icon size={18} /></div>
      <div>
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${c.val}`}>{value?.toLocaleString()}</p>
      </div>
    </div>
  );
};