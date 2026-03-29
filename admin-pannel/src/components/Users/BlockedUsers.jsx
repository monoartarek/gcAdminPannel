import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./BlockedUsers.css";

const PAGE_SIZE = 12;

/* ── helpers ── */
function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}
function getAvatarColor(str) {
  const palette = [
    "#6366f1","#f472b6","#34d399","#fbbf24",
    "#f87171","#60a5fa","#a78bfa","#22d3ee",
  ];
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
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast(`Copied: ${text}`, "copy");
  });
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function BlockedUsers() {
  const [users,         setUsers]         = useState([]);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);
  const [sortBy,        setSortBy]        = useState("newest");
  const [activateModal, setActivateModal] = useState(null);

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── fetch only suspended users ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      q.equalTo("status", "suspended");
      q.descending("createdAt");
      q.limit(1000);
      const results = await q.find({ useMasterKey: true });

      const data = results.map(u => {
        const avatarRaw = u.get("avatar");
        let avatarUrl   = null;
        if (avatarRaw && typeof avatarRaw.url === "function") avatarUrl = avatarRaw.url();
        else if (typeof avatarRaw === "string") avatarUrl = avatarRaw;
        return {
          objectId:  u.id,
          uid:       String(u.get("uid") || u.id),
          name:      u.get("name")     || "—",
          username:  u.get("username") || "anonymous",
          coin:      u.get("coin")     || 0,
          gender:    u.get("gender")   || "—",
          email:     u.get("email")    || "—",
          avatar:    avatarUrl,
          createdAt: u.get("createdAt"),
        };
      });

      setUsers(data);
      setPage(0);
    } catch (err) {
      console.error(err);
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ── filter + sort ── */
  const displayed = useMemo(() => {
    let list = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.uid.toLowerCase().includes(q)      ||
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
      );
    }
    if (sortBy === "name")    list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "coins")   list.sort((a, b) => b.coin - a.coin);
    if (sortBy === "oldest")  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return list;
  }, [users, search, sortBy]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── activate user ── */
  const confirmActivate = async () => {
    if (!activateModal) return;
    const user = activateModal;
    setActivateModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      const obj  = await q.get(user.objectId, { useMasterKey: true });
      obj.set("status", "active");
      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.filter(u => u.objectId !== user.objectId));
      if ((page + 1) * PAGE_SIZE > users.length - 1 && page > 0) setPage(page - 1);
      showToast(`${user.username} has been activated`, "success");
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── pagination ── */
  const pageRange = useMemo(() => {
    const delta = 2, range = [];
    for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++)
      range.push(i);
    return range;
  }, [page, totalPages]);

  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="bu-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`bu-toast bu-toast--${toast.type}`}>
          <span className="bu-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : toast.type === "copy" ? "⎘" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Activate Confirm Modal ── */}
      {activateModal && (
        <div className="bu-overlay" onClick={() => setActivateModal(null)}>
          <div className="bu-modal" onClick={e => e.stopPropagation()}>
            <div className="bu-modal-avatar"
              style={{ background: getAvatarColor(activateModal.username) }}>
              {getInitial(activateModal.name)}
            </div>
            <h3 className="bu-modal-title">Activate User</h3>
            <p className="bu-modal-body">
              Activate <strong>@{activateModal.username}</strong>?<br />
              They will regain full access to the platform.
            </p>
            <div className="bu-modal-actions">
              <button className="bu-modal-cancel" onClick={() => setActivateModal(null)}>
                Cancel
              </button>
              <button className="bu-modal-confirm" onClick={confirmActivate}>
                Yes, Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bu-header">
        <div className="bu-header-left">
          <span className="bu-eyebrow">Moderation</span>
          <h1 className="bu-title">Suspended Users</h1>
          <span className="bu-subtitle">
            {loading ? "…" : `${users.length.toLocaleString()} suspended account${users.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="bu-header-right">
          <div className="bu-view-toggle">
            <button className={`bu-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`bu-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
          <button className="bu-refresh-btn" onClick={fetchUsers} disabled={loading}>
            {loading ? <span className="bu-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="bu-hero">
        <div className="bu-hero-icon">⊘</div>
        <div className="bu-hero-content">
          <div className="bu-hero-num">{loading ? "…" : users.length.toLocaleString()}</div>
          <div className="bu-hero-label">Suspended Accounts</div>
        </div>
        <div className="bu-hero-bar-wrap">
          <div className="bu-hero-bar"
            style={{ width: animated ? `${Math.min(100, users.length * 3)}%` : "0%" }} />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bu-toolbar">
        <div className="bu-search-wrap">
          <span className="bu-search-icon">⌕</span>
          <input className="bu-search"
            placeholder="Search by name, username or UID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && (
            <button className="bu-search-clear" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <select className="bu-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">By Name</option>
          <option value="coins">Most Coins</option>
        </select>
        <span className="bu-result-count">
          {loading ? "" : `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="bu-loading">
          <div className="bu-spinner-wrap">
            <div className="bu-spinner" />
            <div className="bu-spinner bu-spinner--2" />
          </div>
          <p>Fetching suspended users…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="bu-empty">
          <div className="bu-empty-icon">✓</div>
          <p>{search ? "No users match your search" : "No suspended users — all clear!"}</p>
          {search && (
            <button className="bu-empty-reset"
              onClick={() => { setSearch(""); setPage(0); }}>Clear search</button>
          )}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`bu-card-grid ${animated ? "is-animated" : ""}`}>
          {pageItems.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="bu-card"
                style={{ animationDelay: `${i * 45}ms` }}>

                {/* Suspended badge */}
                <div className="bu-card-badge">⊘ Suspended</div>

                {/* Avatar */}
                <div className="bu-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="bu-card-av" />
                    : <div className="bu-card-av bu-card-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="bu-card-av-ring" style={{ borderColor: clr + "55" }} />
                  <div className="bu-card-av-dot" />
                </div>

                {/* Info */}
                <div className="bu-card-info">
                  <p className="bu-card-name">{user.name}</p>
                  <p className="bu-card-uname bu-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username">
                    @{user.username} <span className="bu-copy-icon">⎘</span>
                  </p>
                </div>

                {/* UID chip */}
                <div className="bu-card-uid bu-copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)}
                  title="Click to copy UID">
                  <span className="bu-uid-label">UID</span>
                  <span className="bu-uid-val">{user.uid}</span>
                  <span className="bu-copy-icon">⎘</span>
                </div>

                {/* Meta */}
                <div className="bu-card-meta">
                  <div className="bu-card-meta-row">
                    <span className="bu-meta-key">Coins</span>
                    <span className="bu-meta-val bu-meta-val--gold">{user.coin.toLocaleString()}</span>
                  </div>
                  <div className="bu-card-meta-row">
                    <span className="bu-meta-key">Gender</span>
                    <span className="bu-meta-val">{user.gender}</span>
                  </div>
                  <div className="bu-card-meta-row">
                    <span className="bu-meta-key">Suspended</span>
                    <span className="bu-meta-val">{timeAgo(user.createdAt)}</span>
                  </div>
                </div>

                {/* Activate button */}
                <button className="bu-activate-btn" disabled={isLoading}
                  onClick={() => setActivateModal(user)}>
                  {isLoading ? <span className="bu-btn-spin" /> : "✓ Activate User"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`bu-list-wrap ${animated ? "is-animated" : ""}`}>
          <div className="bu-list-head">
            <span style={{ width: 48, flexShrink: 0 }} />
            <span className="bu-list-hcol bu-list-hcol--grow">Name / Username</span>
            <span className="bu-list-hcol bu-list-hcol--hide-sm">UID</span>
            <span className="bu-list-hcol bu-list-hcol--hide-md">Coins</span>
            <span className="bu-list-hcol bu-list-hcol--hide-md">Since</span>
            <span className="bu-list-hcol">Status</span>
            <span className="bu-list-hcol bu-list-hcol--right">Action</span>
          </div>

          {pageItems.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="bu-list-row"
                style={{ animationDelay: `${i * 28}ms` }}>

                {/* Avatar */}
                <div className="bu-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="bu-list-av" />
                    : <div className="bu-list-av bu-list-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                </div>

                {/* Name */}
                <div className="bu-list-cell bu-list-cell--grow">
                  <span className="bu-list-name">{user.name}</span>
                  <span className="bu-list-uname bu-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy">
                    @{user.username} <span className="bu-copy-icon">⎘</span>
                  </span>
                </div>

                {/* UID */}
                <div className="bu-list-cell bu-list-cell--hide-sm">
                  <span className="bu-list-uid bu-copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}
                    title="Click to copy UID">
                    {user.uid} <span className="bu-copy-icon">⎘</span>
                  </span>
                </div>

                {/* Coins */}
                <div className="bu-list-cell bu-list-cell--hide-md">
                  <span className="bu-list-coin">{user.coin.toLocaleString()}</span>
                </div>

                {/* Since */}
                <div className="bu-list-cell bu-list-cell--hide-md">
                  <span className="bu-list-time">{timeAgo(user.createdAt)}</span>
                </div>

                {/* Status */}
                <div className="bu-list-cell">
                  <span className="bu-status-badge">⊘ Suspended</span>
                </div>

                {/* Activate */}
                <div className="bu-list-cell bu-list-cell--right">
                  <button className="bu-activate-btn bu-activate-btn--sm"
                    disabled={isLoading}
                    onClick={() => setActivateModal(user)}>
                    {isLoading ? <span className="bu-btn-spin" /> : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="bu-pagination">
          <button className="bu-page-btn bu-page-nav"
            disabled={page === 0} onClick={() => changePage(0)}>«</button>
          <button className="bu-page-btn bu-page-nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <><button className="bu-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="bu-page-ellipsis">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`bu-page-btn bu-page-num ${page === i ? "is-active" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 && <span className="bu-page-ellipsis">…</span>}
            <button className="bu-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="bu-page-btn bu-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="bu-page-btn bu-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)}>»</button>
          <span className="bu-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}