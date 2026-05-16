import React, { useState, useEffect, useCallback, useRef } from 'react';
import Parse from '../../parseConfig';
import {
  Search, X, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, AlertTriangle,
  Shield, FileDown, Info, Pencil, Phone, UserMinus,
  UserPlus, Building2, Hash, Users, Star, Check,
  ExternalLink, ChevronDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── constants ──────────────────────────────── */
const PAGE_SIZE = 10;

/* ─── helpers ────────────────────────────────── */
const getInitials = (name = '?') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700',
];
const avatarColor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};

const fmt = n => Number(n || 0).toLocaleString();

/* ─── Toast ───────────────────────────────────── */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const s = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-gray-800' };
  return (
    <div className={`fixed top-20 right-5 z-[999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${s[type] || s.info}`}
      style={{ animation: 'fadeUp .2s ease-out' }}>
      {type === 'success' && <Check size={14} />}
      {type === 'error' && <AlertTriangle size={14} />}
      {msg}
    </div>
  );
};

/* ─── Confirm Modal ───────────────────────────── */
const ConfirmModal = ({ title, desc, onConfirm, onCancel, loading, danger }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ marginTop: '70px' }}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-indigo-100'}`}>
        {danger ? <UserMinus size={22} className="text-red-600" /> : <UserPlus size={22} className="text-indigo-600" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 text-center mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center mb-6">{desc}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── WhatsApp Modal ──────────────────────────── */
const WhatsAppModal = ({ user, onConfirm, onCancel, loading }) => {
  const [num, setNum] = useState(user.whatsapp || '');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ marginTop: '70px' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Phone size={22} className="text-green-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 text-center mb-1">Set WhatsApp Number</h3>
        <p className="text-sm text-gray-500 text-center mb-4">@{user.username}</p>
        <input type="tel" autoFocus value={num}
          onChange={e => setNum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(num || '+8801703449001')}
          placeholder="+880 17..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
        />
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

/* ─── Agencies Modal ──────────────────────────── */
const AgenciesModal = ({ admin, agencies, onClose, onExportPDF }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    style={{ marginTop: '70px' }} onClick={onClose}>
    <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
      style={{ maxHeight: 'calc(100vh - 90px)' }}
      onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div className="flex items-center gap-0 bg-indigo-600 rounded-t-3xl sm:rounded-t-2xl px-6 py-5 shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">Agencies Managed</h2>
          <p className="text-indigo-200 text-xs mt-0.5">By {admin.name} · {agencies.length} agency{agencies.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition">
            <FileDown size={14} /> PDF
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
        {[
          { label: 'Total Agencies', value: agencies.length, color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: 'Active Agents',  value: agencies.filter(a => a.agencyRole === 'agent').length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Admin UID',      value: `#${admin.uid}`, color: 'text-gray-700', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Agency list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {agencies.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Building2 size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No agencies found for this admin.</p>
          </div>
        ) : agencies.map(ag => (
          <div key={ag.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{ag.agencyName || 'Unnamed Agency'}</p>
              <p className="text-xs text-gray-400 mt-0.5">UID: {ag.uid} · @{ag.username}</p>
            </div>
            <span className="shrink-0 ml-3 bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              {ag.agencyRole}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl shrink-0">
        <p className="text-xs text-gray-400">{agencies.length} total agencies</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white transition font-medium">Close</button>
          <button onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
            <FileDown size={15} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  </div>
);

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
        <PgBtn onClick={() => onChange(1)}          disabled={page === 1}          icon={ChevronsLeft} />
        <PgBtn onClick={() => onChange(page - 1)}   disabled={page === 1}          icon={ChevronLeft} />
        {pages[0] > 1 && <span className="px-1 text-gray-400">…</span>}
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="px-1 text-gray-400">…</span>}
        <PgBtn onClick={() => onChange(page + 1)}   disabled={page === totalPages} icon={ChevronRight} />
        <PgBtn onClick={() => onChange(totalPages)} disabled={page === totalPages} icon={ChevronsRight} />
      </div>
    </div>
  );
};
const PgBtn = ({ onClick, disabled, icon: Icon }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
    <Icon size={14} />
  </button>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function AdminManagement() {
  const [admins,        setAdmins]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(1);
  const [totalCount,    setTotalCount]    = useState(0);
  const [searchInput,   setSearchInput]   = useState('');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [statCounts,    setStatCounts]    = useState({ total: 0 });
  const [toast,         setToast]         = useState(null);

  /* modals */
  const [toggleModal,    setToggleModal]    = useState(null); // admin object
  const [waModal,        setWaModal]        = useState(null); // admin object
  const [agenciesModal,  setAgenciesModal]  = useState(null); // { admin, agencies }
  const [agenciesLoading, setAgenciesLoading] = useState(false);

  const searchRef = useRef();
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── map _User parse object to plain ── */
  const mapAdmin = (u) => {
    const av = u.get('avatar');
    let avatarUrl = null;
    if (av && typeof av.url === 'function') avatarUrl = av.url();
    else if (av?.url) avatarUrl = av.url;
    else if (typeof av === 'string') avatarUrl = av;

    return {
      objectId:   u.id,
      uid:        String(u.get('uid') || u.id),
      name:       u.get('name')             || '—',
      username:   u.get('username')         || 'anonymous',
      gender:     u.get('gender')           || '—',
      whatsapp:   u.get('whatsapp_number')  || '',
      adminRole:  u.get('admin_role')       || '',
      isAdmin:    u.get('admin_role') === 'admin',
      avatarUrl,
    };
  };

  /* ── fetch admins page ── */
  const fetchPage = useCallback(async (pg, q) => {
    setLoading(true);
    try {
      const mk = { useMasterKey: true };
      const User = Parse.Object.extend('_User');

      const buildQ = () => {
        const qry = new Parse.Query(User);
        qry.equalTo('admin_role', 'admin');
        qry.select(['uid', 'name', 'username', 'gender', 'avatar', 'admin_role', 'whatsapp_number']);
        if (q.trim()) {
          const n = parseInt(q.trim());
          if (!isNaN(n)) qry.equalTo('uid', n);
          else qry.matches('name', q.trim(), 'i');
        }
        return qry;
      };

      const dq = buildQ(); const cq = buildQ();
      dq.descending('createdAt');
      dq.limit(PAGE_SIZE);
      dq.skip((pg - 1) * PAGE_SIZE);

      const [results, count] = await Promise.all([dq.find(mk), cq.count(mk)]);
      setAdmins(results.map(mapAdmin));
      setTotalCount(count);
    } catch (e) {
      console.error(e);
      showToast('Fetch failed: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* ── fetch stat counts ── */
  const fetchStats = useCallback(async () => {
    try {
      const q = new Parse.Query('_User');
      q.equalTo('admin_role', 'admin');
      const total = await q.count({ useMasterKey: true });
      setStatCounts({ total });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPage(1, '');
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchPage(page, searchTerm);
  }, [page, searchTerm]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* ── fetch agencies for an admin ── */
  const fetchAgencies = async (adminObjectId) => {
    try {
      const q = new Parse.Query('_User');
      q.equalTo('admin_id', adminObjectId);
      q.equalTo('agency_role', 'agent');
      q.select(['uid', 'name', 'username', 'agency_name', 'agency_role']);
      q.limit(1000);
      const res = await q.find({ useMasterKey: true });
      return res.map(a => ({
        id:         a.id,
        uid:        String(a.get('uid') || '—'),
        name:       a.get('name')        || '—',
        username:   a.get('username')    || '—',
        agencyName: a.get('agency_name') || '—',
        agencyRole: a.get('agency_role') || '—',
      }));
    } catch (e) { console.error(e); return []; }
  };

  /* ── open agencies modal ── */
  const openAgencies = async (admin) => {
    setAgenciesLoading(true);
    const agencies = await fetchAgencies(admin.objectId);
    setAgenciesModal({ admin, agencies });
    setAgenciesLoading(false);
  };

  /* ── export PDF ── */
  const exportPDF = (admin, agencies) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      /* Title */
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Agency Report', 14, 18);

      /* Subtitle */
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(`Admin: ${admin.name}   |   UID: ${admin.uid}   |   @${admin.username}`, 14, 26);
      doc.text(`WhatsApp: ${admin.whatsapp || '—'}   |   Generated: ${new Date().toLocaleString()}`, 14, 32);
      doc.text(`Total Agencies: ${agencies.length}`, 14, 38);

      /* Table */
      autoTable(doc, {
        head: [['#', 'Agency Name', 'UID', 'Username', 'Role']],
        body: agencies.map((ag, i) => [
          i + 1,
          ag.agencyName,
          ag.uid,
          '@' + ag.username,
          ag.agencyRole,
        ]),
        startY: 44,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [238, 242, 255] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 60 },
          2: { cellWidth: 25 },
          3: { cellWidth: 50 },
          4: { cellWidth: 30 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
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

      doc.save(`Admin_${admin.uid}_Agencies_${Date.now()}.pdf`);
      showToast('PDF exported!', 'success');
    } catch (err) {
      console.error('PDF error:', err);
      showToast('PDF failed: ' + err.message, 'error');
    }
  };

  /* ── toggle admin role ── */
  const confirmToggle = async () => {
    const admin = toggleModal;
    setToggleModal(null);
    setActionLoading(admin.objectId);
    try {
      const obj = await new Parse.Query('_User').get(admin.objectId, { useMasterKey: true });
      const newRole = admin.isAdmin ? '' : 'admin';
      obj.set('admin_role', newRole);
      await obj.save(null, { useMasterKey: true });

      /* sync AgentRole class */
      if (admin.isAdmin) {
        /* removing admin — destroy AgentRole record */
        const aq = new Parse.Query('AgentRole');
        aq.equalTo('admin_id', admin.objectId);
        const found = await aq.first({ useMasterKey: true });
        if (found) await found.destroy({ useMasterKey: true });
      } else {
        /* making admin — create AgentRole record */
        const AgentRole = Parse.Object.extend('AgentRole');
        const rec = new AgentRole();
        rec.set('admin_id', admin.objectId);
        rec.set('admin_by_id', 'admin');
        rec.set('total_points', 0);
        rec.set('points', 0);
        rec.set('total_agent', 0);
        rec.setArray('agents_list', []);
        await rec.save(null, { useMasterKey: true });
      }

      showToast(admin.isAdmin ? `@${admin.username} removed from admins` : `@${admin.username} is now an Admin ✓`, 'success');
      fetchPage(page, searchTerm);
      fetchStats();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    finally { setActionLoading(null); }
  };

  /* ── set whatsapp ── */
  const confirmWA = async (num) => {
    const admin = waModal;
    setWaModal(null);
    setActionLoading(admin.objectId);
    try {
      const obj = await new Parse.Query('_User').get(admin.objectId, { useMasterKey: true });
      obj.set('whatsapp_number', num);
      await obj.save(null, { useMasterKey: true });
      setAdmins(list => list.map(a => a.objectId === admin.objectId ? { ...a, whatsapp: num } : a));
      showToast('WhatsApp updated!', 'success');
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
    finally { setActionLoading(null); }
  };

  /* ─── RENDER ──────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingTop: '70px' }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Modals */}
      {toggleModal && (
        <ConfirmModal
          title={toggleModal.isAdmin ? 'Remove Admin' : 'Make Admin'}
          desc={toggleModal.isAdmin
            ? `Remove @${toggleModal.username} from admin role? Their AgentRole record will also be deleted.`
            : `Grant admin role to @${toggleModal.username}? An AgentRole record will be created.`}
          danger={toggleModal.isAdmin}
          onConfirm={confirmToggle}
          onCancel={() => setToggleModal(null)}
          loading={actionLoading === toggleModal?.objectId}
        />
      )}
      {waModal && (
        <WhatsAppModal user={waModal}
          onConfirm={confirmWA} onCancel={() => setWaModal(null)}
          loading={actionLoading === waModal?.objectId} />
      )}
      {agenciesModal && (
        <AgenciesModal
          admin={agenciesModal.admin}
          agencies={agenciesModal.agencies}
          onClose={() => setAgenciesModal(null)}
          onExportPDF={() => exportPDF(agenciesModal.admin, agenciesModal.agencies)}
        />
      )}

      {/* ── Fixed sticky header ── */}
      <div className="bg-white border-b border-gray-100 fixed top-[70px] left-0 right-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900">Admin Management</h1>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <span>Dashboard</span><span>/</span>
              <span className="text-gray-700 font-medium">Admins</span>
            </nav>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={async () => { await fetchStats(); fetchPage(page, searchTerm); }}
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

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Admins', val: statCounts.total, color: 'indigo', icon: Shield },
            { label: 'On This Page', val: admins.length,    color: 'sky',    icon: Users  },
            { label: 'Total Pages',  val: totalPages,       color: 'violet', icon: Hash   },
          ].map(s => {
            const c = {
              indigo: { bg: 'bg-indigo-50 border-indigo-100', icon: 'bg-indigo-100 text-indigo-600', val: 'text-indigo-700' },
              sky:    { bg: 'bg-sky-50 border-sky-100',       icon: 'bg-sky-100 text-sky-600',       val: 'text-sky-700'   },
              violet: { bg: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', val: 'text-violet-700'},
            }[s.color];
            return (
              <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${c.bg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${c.val}`}>{s.val.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Search Bar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearchTerm(searchInput); setPage(1); } }}
              placeholder="Search by name or UID… (press Enter)"
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setSearchTerm(searchInput); setPage(1); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition active:scale-95 shrink-0"
          >
            <Search size={14} /> Search
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
            {loading
              ? <><Loader2 size={13} className="animate-spin text-indigo-500" /> Loading…</>
              : <span className="bg-gray-100 px-3 py-1.5 rounded-lg font-medium">{totalCount.toLocaleString()} admins</span>
            }
          </div>
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  {['Object ID', 'Admin Profile', 'UID', 'WhatsApp', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded" style={{ width: `${40 + (j * 13) % 45}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Shield size={32} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">No admins found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
                    </td>
                  </tr>
                ) : admins.map(admin => {
                  const il = actionLoading === admin.objectId;
                  return (
                    <tr key={admin.objectId} className="hover:bg-indigo-50/20 transition-colors">
                      {/* Object ID */}
                      <td className="px-5 py-4">
                        <code className="text-[11px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md font-mono">{admin.objectId}</code>
                      </td>
                      {/* Profile */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {admin.avatarUrl
                            ? <img src={admin.avatarUrl} alt={admin.name} className="w-9 h-9 rounded-full object-cover border-2 border-indigo-100 shrink-0" />
                            : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(admin.username)}`}>{getInitials(admin.name)}</div>
                          }
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 whitespace-nowrap">{admin.name}</p>
                            <p className="text-xs text-gray-400">@{admin.username}</p>
                          </div>
                        </div>
                      </td>
                      {/* UID */}
                      <td className="px-5 py-4">
                        <code className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono font-bold">#{admin.uid}</code>
                      </td>
                      {/* WhatsApp */}
                      <td className="px-5 py-4 text-xs text-gray-500 font-mono">{admin.whatsapp || '—'}</td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        {admin.isAdmin
                          ? <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full text-[11px] font-semibold"><Shield size={10} /> Admin</span>
                          : <span className="text-[11px] text-gray-400 border border-gray-100 px-2.5 py-1 rounded-full">User</span>
                        }
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* View Agencies */}
                          <button onClick={() => openAgencies(admin)} disabled={il || agenciesLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-lg hover:bg-sky-100 transition disabled:opacity-50 whitespace-nowrap">
                            {agenciesLoading ? <Loader2 size={10} className="animate-spin" /> : <Building2 size={10} />} Agencies
                          </button>
                          {/* Export PDF */}
                          <button onClick={async () => { const ags = await fetchAgencies(admin.objectId); exportPDF(admin, ags); }} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition disabled:opacity-50 whitespace-nowrap">
                            <FileDown size={10} /> PDF
                          </button>
                          {/* WhatsApp */}
                          <button onClick={() => setWaModal(admin)} disabled={il}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition disabled:opacity-50 whitespace-nowrap">
                            <Phone size={10} /> WA
                          </button>
                          {/* Toggle admin */}
                          <button onClick={() => setToggleModal(admin)} disabled={il}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition disabled:opacity-50 whitespace-nowrap ${admin.isAdmin ? 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100' : 'text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'}`}>
                            {admin.isAdmin ? <><UserMinus size={10} /> Remove</> : <><UserPlus size={10} /> Make Admin</>}
                          </button>
                          {il && <Loader2 size={14} className="animate-spin text-indigo-400" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && admins.length > 0 && totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
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
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 bg-gray-100 rounded-xl" />
                  <div className="h-9 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))
          ) : admins.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Shield size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No admins found.</p>
            </div>
          ) : admins.map(admin => {
            const il = actionLoading === admin.objectId;
            return (
              <div key={admin.objectId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Top */}
                <div className="flex items-center gap-3 p-4 pb-3">
                  {admin.avatarUrl
                    ? <img src={admin.avatarUrl} alt={admin.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shrink-0" />
                    : <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(admin.username)}`}>{getInitials(admin.name)}</div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{admin.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <code className="text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">#{admin.uid}</code>
                      <span className="text-xs text-gray-400">@{admin.username}</span>
                    </div>
                  </div>
                  {admin.isAdmin
                    ? <span className="shrink-0 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Shield size={9} /> Admin</span>
                    : <span className="shrink-0 text-[11px] text-gray-400 border border-gray-100 px-2 py-0.5 rounded-full">User</span>
                  }
                </div>

                {/* Object ID */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-y border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Object ID</span>
                  <code className="text-[11px] font-mono text-gray-500">{admin.objectId}</code>
                </div>

                {/* WhatsApp */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Phone size={12} /> WhatsApp
                  </div>
                  <span className="text-xs font-mono text-gray-600">{admin.whatsapp || '—'}</span>
                </div>

                {/* Action Buttons */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  {/* Agencies — full width */}
                  <button onClick={() => openAgencies(admin)} disabled={il || agenciesLoading}
                    className="col-span-2 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 active:scale-95 transition disabled:opacity-50">
                    {agenciesLoading ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                    View Agencies
                  </button>
                  {/* PDF */}
                  <button onClick={async () => { const ags = await fetchAgencies(admin.objectId); exportPDF(admin, ags); }} disabled={il}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 active:scale-95 transition disabled:opacity-50">
                    <FileDown size={12} /> Export PDF
                  </button>
                  {/* WA */}
                  <button onClick={() => setWaModal(admin)} disabled={il}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 active:scale-95 transition disabled:opacity-50">
                    <Phone size={12} /> WhatsApp
                  </button>
                  {/* Toggle */}
                  <button onClick={() => setToggleModal(admin)} disabled={il}
                    className={`col-span-2 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border active:scale-95 transition disabled:opacity-50 ${admin.isAdmin ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' : 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}`}>
                    {admin.isAdmin ? <><UserMinus size={12} /> Remove Admin</> : <><UserPlus size={12} /> Make Admin</>}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Mobile Pagination */}
          {!loading && admins.length > 0 && totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
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