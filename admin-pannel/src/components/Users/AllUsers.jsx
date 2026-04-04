import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AllUsers.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye, faPen, faBan, faCircleCheck,
  faRotateRight, faTableList, faBorderAll,
} from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 25;

/* ── helpers ── */
function getInitial(name) { return (name || "?").charAt(0).toUpperCase(); }
function getAvatarColor(str) {
  const palette = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB");
}
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text).then(() => {
    showToast(`Copied: ${text}`, "copy");
  }).catch(() => {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand("copy");
    document.body.removeChild(el);
    showToast(`Copied: ${text}`, "copy");
  });
}

/* ── build server-side query ── */
function buildSearchQuery(User, statusFilter, srch) {
  const trim = srch.trim();
  if (trim) {
    const queries = [];
    const qN = new Parse.Query(User); qN.contains("name",     trim); queries.push(qN);
    const qU = new Parse.Query(User); qU.contains("username", trim); queries.push(qU);
    const uidNum = parseInt(trim);
    if (!isNaN(uidNum)) {
      const qI = new Parse.Query(User); qI.equalTo("uid", uidNum); queries.push(qI);
    }
    const combined = Parse.Query.or(...queries);
    if (statusFilter === "suspended") combined.equalTo("status", "suspended");
    if (statusFilter === "active")    combined.notEqualTo("status", "suspended");
    return combined;
  }
  const q = new Parse.Query(User);
  if (statusFilter === "suspended") q.equalTo("status", "suspended");
  if (statusFilter === "active")    q.notEqualTo("status", "suspended");
  return q;
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AllUsers() {
  const [users,         setUsers]         = useState([]);
  const [searchInput,   setSearchInput]   = useState("");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [sortBy,        setSortBy]        = useState("newest");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);

  /* stat counts */
  const [statCounts, setStatCounts] = useState({ total: 0, active: 0, suspended: 0 });

  /* modals */
  const [viewUser,     setViewUser]     = useState(null);
  const [editUser,     setEditUser]     = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── stat counts ── */
  const fetchStatCounts = useCallback(async () => {
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };
      const qTotal     = new Parse.Query(User);
      const qSuspended = new Parse.Query(User); qSuspended.equalTo("status", "suspended");
      const qActive    = new Parse.Query(User); qActive.notEqualTo("status", "suspended");
      const [total, suspended, active] = await Promise.all([
        qTotal.count(mk), qSuspended.count(mk), qActive.count(mk),
      ]);
      setStatCounts({ total, suspended, active });
    } catch (err) { console.error("Stat count error:", err); }
  }, []);

  /* ── fetch page ── */
  const fetchPage = useCallback(async (pageNum, statusF, srch, sort) => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };

      const q      = buildSearchQuery(User, statusF, srch);
      const countQ = buildSearchQuery(User, statusF, srch);

      /* sort */
      if (sort === "oldest") q.ascending("createdAt");
      else if (sort === "name") q.ascending("name");
      else if (sort === "coins") q.descending("coin");
      else q.descending("createdAt");

      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select("uid","name","username","coin","gender","status","mode","email","birthday","avatar","createdAt");

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);

      setTotalCount(count);
      setUsers(batch.map(u => {
        const av = u.get("avatar");
        let avatarUrl = null;
        if (av && typeof av.url === "function") avatarUrl = av.url();
        else if (typeof av === "string") avatarUrl = av;
        return {
          objectId:  u.id,
          uid:       String(u.get("uid") || u.id),
          name:      u.get("name")     || "—",
          username:  u.get("username") || "anonymous",
          coin:      u.get("coin")     || 0,
          gender:    u.get("gender")   || "—",
          status:    u.get("status")   || "active",
          mode:      u.get("mode")     || "—",
          email:     u.get("email")    || "—",
          birthday:  u.get("birthday") || null,
          avatar:    avatarUrl,
          createdAt: u.get("createdAt"),
        };
      }));
    } catch (err) {
      console.error(err);
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPage(page, statusFilter, search, sortBy);
  }, [page, statusFilter, search, sortBy, fetchPage]);

  useEffect(() => { fetchStatCounts(); }, [fetchStatCounts]);

  /* ── pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const delta = 2, range = [];
    for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++)
      range.push(i);
    return range;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ── suspend toggle ── */
  const confirmSuspend = async () => {
    if (!suspendModal) return;
    const user      = suspendModal;
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    setSuspendModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const obj  = await new Parse.Query(User).get(user.objectId, { useMasterKey: true });
      obj.set("status", newStatus);
      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, status: newStatus } : u
      ));
      fetchStatCounts();
      showToast(`${user.username} ${newStatus === "suspended" ? "suspended" : "activated"}`,
        newStatus === "suspended" ? "info" : "success");
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally { setActionLoading(null); }
  };

  /* ── edit save ── */
  const saveEdit = async () => {
    if (!editUser) return;
    setActionLoading(editUser.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const obj  = await new Parse.Query(User).get(editUser.objectId, { useMasterKey: true });
      obj.set("username", editUser.username);
      obj.set("coin",     Number(editUser.coin) || 0);
      obj.set("gender",   editUser.gender);
      obj.set("mode",     editUser.mode);
      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.map(u =>
        u.objectId === editUser.objectId ? { ...u, ...editUser, coin: Number(editUser.coin) || 0 } : u
      ));
      setEditUser(null);
      showToast(`${editUser.username} updated successfully`, "success");
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally { setActionLoading(null); }
  };

  const refresh = () => {
    fetchPage(page, statusFilter, search, sortBy);
    fetchStatCounts();
  };

  /* ════════════ VIEW USER MODAL ════════════ */
  if (viewUser) {
    const clr = getAvatarColor(viewUser.username);
    return (
      <div className="au-profile-overlay">
        <div className="au-profile-modal">
          <button className="au-back-btn" onClick={() => setViewUser(null)}>← Back</button>
          <div className="au-profile-avatar-wrap">
            {viewUser.avatar
              ? <img src={viewUser.avatar} alt={viewUser.username} className="au-profile-avatar" />
              : <div className="au-profile-avatar au-profile-avatar--init" style={{ background: clr }}>
                  {getInitial(viewUser.name)}
                </div>
            }
            <span className={`au-profile-status-dot ${viewUser.status === "suspended" ? "is-suspended" : "is-active"}`} />
          </div>
          <h2 className="au-profile-name">{viewUser.name}</h2>
          <p className="au-profile-uname au-copyable"
            onClick={() => copyToClipboard(viewUser.username, showToast)} title="Click to copy">
            @{viewUser.username} <span className="au-copy-icon">⎘</span>
          </p>
          <div className="au-profile-grid">
            {[
              { label: "UID",      value: viewUser.uid,      copy: true  },
              { label: "Coins",    value: viewUser.coin,     copy: false },
              { label: "Gender",   value: viewUser.gender,   copy: false },
              { label: "Status",   value: viewUser.status,   copy: false },
              { label: "Mode",     value: viewUser.mode,     copy: false },
              { label: "Email",    value: viewUser.email,    copy: true  },
              { label: "Birthday", value: viewUser.birthday ? new Date(viewUser.birthday).toLocaleDateString("en-GB") : "—", copy: false },
              { label: "Joined",   value: timeAgo(viewUser.createdAt), copy: false },
            ].map(({ label, value, copy }) => (
              <div key={label}
                className={`au-profile-field ${copy ? "au-copyable" : ""}`}
                onClick={copy ? () => copyToClipboard(String(value), showToast) : undefined}
                title={copy ? "Click to copy" : undefined}>
                <span className="au-field-label">{label}</span>
                <span className="au-field-value">
                  {String(value ?? "—")}
                  {copy && <span className="au-copy-icon">⎘</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="au-profile-actions">
            <button className="au-profile-edit-btn"
              onClick={() => { setViewUser(null); setEditUser(viewUser); }}>
              <FontAwesomeIcon icon={faPen} /> Edit User
            </button>
            <button
              className={`au-profile-suspend-btn ${viewUser.status === "suspended" ? "is-activate" : ""}`}
              onClick={() => { setViewUser(null); setSuspendModal(viewUser); }}>
              <FontAwesomeIcon icon={viewUser.status === "suspended" ? faCircleCheck : faBan} />
              {" "}{viewUser.status === "suspended" ? "Activate" : "Suspend"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════ EDIT USER MODAL ════════════ */
  if (editUser) {
    return (
      <div className="au-edit-overlay">
        <div className="au-edit-modal">
          <button className="au-back-btn" onClick={() => setEditUser(null)}>← Back</button>
          <h2 className="au-edit-title">Edit User</h2>
          <p className="au-edit-subtitle">@{editUser.username}</p>
          <div className="au-edit-fields">
            {[
              { key: "username", label: "Username", type: "text"   },
              { key: "coin",     label: "Coins",    type: "number" },
              { key: "gender",   label: "Gender",   type: "text"   },
              { key: "mode",     label: "Mode",     type: "text"   },
            ].map(({ key, label, type }) => (
              <div key={key} className="au-edit-field">
                <label className="au-edit-label">{label}</label>
                <input className="au-edit-input" type={type}
                  value={editUser[key] || ""}
                  onChange={e => setEditUser(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={label} />
              </div>
            ))}
          </div>
          <div className="au-edit-actions">
            <button className="au-edit-cancel" onClick={() => setEditUser(null)}>Cancel</button>
            <button className="au-edit-save" onClick={saveEdit}
              disabled={actionLoading === editUser.objectId}>
              {actionLoading === editUser.objectId ? <span className="au-btn-spin" /> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════ MAIN LIST ════════════ */
  return (
    <div className="au-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`au-toast au-toast--${toast.type}`}>
          <span className="au-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : toast.type === "copy" ? "⎘" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Suspend Modal ── */}
      {suspendModal && (
        <div className="au-overlay" onClick={() => setSuspendModal(null)}>
          <div className="au-modal" onClick={e => e.stopPropagation()}>
            <div className="au-modal-icon"
              style={{ background: suspendModal.status === "suspended" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)" }}>
              <FontAwesomeIcon icon={suspendModal.status === "suspended" ? faCircleCheck : faBan}
                style={{ color: suspendModal.status === "suspended" ? "#34d399" : "#f87171", fontSize: 22 }} />
            </div>
            <h3 className="au-modal-title">
              {suspendModal.status === "suspended" ? "Activate User" : "Suspend User"}
            </h3>
            <p className="au-modal-body">
              {suspendModal.status === "suspended"
                ? <>Activate <strong>@{suspendModal.username}</strong>? They will regain access.</>
                : <>Suspend <strong>@{suspendModal.username}</strong>? They will lose access.</>
              }
            </p>
            <div className="au-modal-actions">
              <button className="au-modal-cancel" onClick={() => setSuspendModal(null)}>Cancel</button>
              <button
                className={`au-modal-confirm ${suspendModal.status === "suspended" ? "is-green" : "is-red"}`}
                onClick={confirmSuspend}>
                {suspendModal.status === "suspended" ? "Yes, Activate" : "Yes, Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="au-header">
        <div className="au-header-left">
          <span className="au-eyebrow">User Management</span>
          <h1 className="au-title">All Users</h1>
          <span className="au-subtitle">
            {`${statCounts.total.toLocaleString()} users · ${statCounts.active} active · ${statCounts.suspended} suspended`}
          </span>
        </div>
        <div className="au-header-right">
          <div className="au-view-toggle">
            <button className={`au-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>
              <FontAwesomeIcon icon={faTableList} /> List
            </button>
            <button className={`au-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>
              <FontAwesomeIcon icon={faBorderAll} /> Cards
            </button>
          </div>
          <button className="au-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? <span className="au-btn-spin" /> : <><FontAwesomeIcon icon={faRotateRight} /> Refresh</>}
          </button>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="au-stat-pills">
        {[
          { label: "All",       val: statCounts.total,     color: "violet", key: "all"       },
          { label: "Active",    val: statCounts.active,    color: "green",  key: "active"    },
          { label: "Suspended", val: statCounts.suspended, color: "red",    key: "suspended" },
        ].map((s, i) => (
          <button key={s.key}
            className={`au-stat-pill au-stat-pill--${s.color} ${statusFilter === s.key ? "is-active" : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => { setStatusFilter(s.key); setPage(0); }}>
            <span className="au-stat-val">{s.val.toLocaleString()}</span>
            <span className="au-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="au-toolbar">
        <div className="au-search-wrap">
          <span className="au-search-icon">⌕</span>
          <input className="au-search"
            placeholder="Search name, username or UID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="au-search-clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <select className="au-select" value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(0); }}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">By Name</option>
          <option value="coins">Most Coins</option>
        </select>
        <span className="au-result-count">
          {!loading && `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Page indicator ── */}
      {!loading && totalPages > 1 && (
        <div className="au-page-indicator">
          <span>Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></span>
          <span className="au-page-indicator-dot" />
          <span>Records <strong>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong></span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="au-loading">
          <div className="au-spinner-wrap">
            <div className="au-spinner" />
            <div className="au-spinner au-spinner--2" />
          </div>
          <p>Fetching users…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="au-empty">
          <div className="au-empty-icon">◎</div>
          <p>No users found</p>
          <button className="au-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`au-card-grid ${animated ? "is-animated" : ""}`}>
          {users.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            const suspended = user.status === "suspended";
            return (
              <div key={user.objectId}
                className={`au-card ${suspended ? "au-card--suspended" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}>

                {suspended && <div className="au-card-suspended-tag">Suspended</div>}

                <div className="au-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="au-card-av" />
                    : <div className="au-card-av au-card-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="au-card-av-ring" style={{ borderColor: clr + "55" }} />
                  <div className={`au-card-status-dot ${suspended ? "is-suspended" : "is-active"}`} />
                </div>

                <div className="au-card-info">
                  <p className="au-card-name">{user.name}</p>
                  <p className="au-card-uname au-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username">
                    @{user.username} <span className="au-copy-icon">⎘</span>
                  </p>
                </div>

                <div className="au-card-uid au-copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)}
                  title="Click to copy UID">
                  <span className="au-uid-label">UID</span>
                  <span className="au-uid-val">{user.uid}</span>
                  <span className="au-copy-icon">⎘</span>
                </div>

                <div className="au-card-meta">
                  <div className="au-card-meta-row">
                    <span className="au-meta-key">Coins</span>
                    <span className="au-meta-val au-meta-val--gold">{user.coin.toLocaleString()}</span>
                  </div>
                  <div className="au-card-meta-row">
                    <span className="au-meta-key">Gender</span>
                    <span className="au-meta-val">{user.gender}</span>
                  </div>
                  <div className="au-card-meta-row">
                    <span className="au-meta-key">Joined</span>
                    <span className="au-meta-val">{timeAgo(user.createdAt)}</span>
                  </div>
                </div>

                <div className="au-card-actions">
                  <button className="au-view-btn" title="View" onClick={() => setViewUser(user)}>
                    <FontAwesomeIcon icon={faEye} /> View
                  </button>
                  <button className="au-edit-btn" title="Edit" onClick={() => setEditUser(user)}>
                    <FontAwesomeIcon icon={faPen} /> Edit
                  </button>
                  <button
                    className={`au-suspend-btn ${suspended ? "is-activate" : ""}`}
                    disabled={isLoading}
                    title={suspended ? "Activate" : "Suspend"}
                    onClick={() => setSuspendModal(user)}>
                    {isLoading
                      ? <span className="au-btn-spin" />
                      : <><FontAwesomeIcon icon={suspended ? faCircleCheck : faBan} /> {suspended ? "Activate" : "Suspend"}</>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`au-list-wrap ${animated ? "is-animated" : ""}`}>

          {/* Header row */}
          <div className="au-list-head">
            <span />
            <span className="au-list-hcol">Name / Username</span>
            <span className="au-list-hcol">UID</span>
            <span className="au-list-hcol">Coins</span>
            <span className="au-list-hcol">Joined</span>
            <span className="au-list-hcol">Status</span>
            <span className="au-list-hcol au-list-hcol--right">Actions</span>
          </div>

          {users.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            const suspended = user.status === "suspended";
            return (
              <div key={user.objectId}
                className={`au-list-row ${suspended ? "au-list-row--suspended" : ""}`}
                style={{ animationDelay: `${i * 28}ms` }}>

                {/* Avatar */}
                <div className="au-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="au-list-av" />
                    : <div className="au-list-av au-list-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                </div>

                {/* Name + username */}
                <div className="au-list-name-cell">
                  <span className="au-list-name">{user.name}</span>
                  <span className="au-list-uname au-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy">
                    @{user.username} <span className="au-copy-icon">⎘</span>
                  </span>
                </div>

                {/* UID */}
                <div className="au-list-uid-cell">
                  <span className="au-list-uid au-copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}
                    title="Click to copy UID">
                    {user.uid} <span className="au-copy-icon">⎘</span>
                  </span>
                </div>

                {/* Coins */}
                <div className="au-list-coin-cell">
                  <span className="au-list-coin">{user.coin.toLocaleString()}</span>
                </div>

                {/* Joined */}
                <div className="au-list-time-cell">
                  <span className="au-list-time">{timeAgo(user.createdAt)}</span>
                </div>

                {/* Status */}
                <div className="au-list-status-cell">
                  <span className={`au-status-badge ${suspended ? "is-suspended" : "is-active"}`}>
                    {suspended ? "Suspended" : "Active"}
                  </span>
                </div>

                {/* Actions */}
                <div className="au-list-actions-cell">
                  <button className="au-icon-btn au-icon-btn--view" title="View"
                    onClick={() => setViewUser(user)}>
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button className="au-icon-btn au-icon-btn--edit" title="Edit"
                    onClick={() => setEditUser(user)}>
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    className={`au-icon-btn ${suspended ? "au-icon-btn--activate" : "au-icon-btn--suspend"}`}
                    title={suspended ? "Activate" : "Suspend"}
                    disabled={isLoading}
                    onClick={() => setSuspendModal(user)}>
                    {isLoading
                      ? <span className="au-btn-spin" />
                      : <FontAwesomeIcon icon={suspended ? faCircleCheck : faBan} />
                    }
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="au-pagination">
          <button className="au-page-btn au-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(0)}>«</button>
          <button className="au-page-btn au-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <><button className="au-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="au-page-ellipsis">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`au-page-btn au-page-num ${page === i ? "is-active" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 && <span className="au-page-ellipsis">…</span>}
            <button className="au-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="au-page-btn au-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="au-page-btn au-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(totalPages - 1)}>»</button>
          <span className="au-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}