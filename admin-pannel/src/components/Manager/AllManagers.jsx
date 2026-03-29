import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AllManagers.css";

const PAGE_SIZE = 12;

/* ── helpers ── */
function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}
function getAvatarColor(str) {
  const palette = [
    "#34d399","#60a5fa","#f472b6","#fbbf24",
    "#a78bfa","#22d3ee","#f87171","#6366f1",
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
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB");
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AllManagers() {
  const [managers,      setManagers]      = useState([]);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [animated,      setAnimated]      = useState(false);
  const [sortBy,        setSortBy]        = useState("newest");

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── fetch managers ── */
  const fetchManagers = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      q.equalTo("role", "manager");
      q.limit(1000);
      q.descending("createdAt");
      const results = await q.find({ useMasterKey: true });

      const data = results.map(u => {
        const avatarRaw = u.get("avatar");
        let avatarUrl   = null;
        if (avatarRaw && typeof avatarRaw.url === "function") avatarUrl = avatarRaw.url();
        else if (typeof avatarRaw === "string") avatarUrl = avatarRaw;

        return {
          objectId:  u.id,
          uid:       String(u.get("uid") || u.id),
          name:      u.get("name")      || "—",
          username:  u.get("username")  || "anonymous",
          role:      u.get("role")      || "manager",
          country:   u.get("country")   || null,
          avatar:    avatarUrl,
          createdAt: u.get("createdAt"),
        };
      });

      setManagers(data);
      setPage(0);
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("Failed to fetch managers: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchManagers(); }, [fetchManagers]);

  /* ── filter + sort ── */
  const displayed = useMemo(() => {
    let list = [...managers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.uid.toLowerCase().includes(q)      ||
        m.username.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q)     ||
        (m.country || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name")   list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "oldest") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return list;
  }, [managers, search, sortBy]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── remove ── */
  const handleRemove = (manager) => setConfirmModal(manager);

  const confirmRemove = async () => {
    if (!confirmModal) return;
    const manager = confirmModal;
    setConfirmModal(null);
    setActionLoading(manager.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      const obj  = await q.get(manager.objectId, { useMasterKey: true });
      obj.set("role", "user");
      await obj.save(null, { useMasterKey: true });

      const updated = managers.filter(m => m.objectId !== manager.objectId);
      setManagers(updated);

      if ((page + 1) * PAGE_SIZE > updated.length && page > 0) setPage(page - 1);
      showToast(`${manager.username} is no longer a manager`, "info");
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── pagination range ── */
  const pageRange = useMemo(() => {
    const delta = 2, range = [];
    for (
      let i = Math.max(0, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) range.push(i);
    return range;
  }, [page, totalPages]);

  const changePage = n => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="am-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`am-toast am-toast--${toast.type}`}>
          <span className="am-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="am-overlay" onClick={() => setConfirmModal(null)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-avatar"
              style={{ background: getAvatarColor(confirmModal.username) }}>
              {getInitial(confirmModal.name)}
            </div>
            <h3 className="am-modal-title">Remove Manager</h3>
            <p className="am-modal-body">
              Remove manager role from <strong>@{confirmModal.username}</strong>?
              They will become a regular user.
            </p>
            <div className="am-modal-actions">
              <button className="am-modal-cancel" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button className="am-modal-confirm" onClick={confirmRemove}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="am-header">
        <div className="am-header-left">
          <span className="am-eyebrow">Role Management</span>
          <h1 className="am-title">All Managers</h1>
          <span className="am-subtitle">
            {loading ? "…" : `${managers.length.toLocaleString()} manager${managers.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="am-header-right">
          {/* View toggle */}
          <div className="am-view-toggle">
            <button className={`am-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`am-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>

          {/* Refresh */}
          <button className="am-refresh-btn" onClick={fetchManagers} disabled={loading}>
            {loading ? <span className="am-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Hero Stat ── */}
      <div className="am-hero">
        <div className="am-hero-num">{loading ? "…" : managers.length.toLocaleString()}</div>
        <div className="am-hero-label">Active Managers</div>
        <div className="am-hero-bar">
          <div className="am-hero-bar-fill"
            style={{ width: loading ? "0%" : `${Math.min(100, managers.length * 2)}%` }} />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="am-toolbar">
        <div className="am-search-wrap">
          <span className="am-search-icon">⌕</span>
          <input
            className="am-search"
            placeholder="Search by name, username, UID or country…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="am-search-clear" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>

        <select className="am-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">By Name</option>
        </select>

        <span className="am-result-count">
          {loading ? "" : `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="am-loading">
          <div className="am-spinner-wrap">
            <div className="am-spinner" />
            <div className="am-spinner am-spinner--2" />
          </div>
          <p>Fetching managers…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="am-empty">
          <div className="am-empty-icon">⬡</div>
          <p>{search ? "No managers match your search" : "No managers found"}</p>
          {search && (
            <button className="am-empty-reset"
              onClick={() => { setSearch(""); setPage(0); }}>Clear search</button>
          )}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`am-card-grid ${animated ? "is-animated" : ""}`}>
          {pageItems.map((m, i) => {
            const clr       = getAvatarColor(m.username);
            const isLoading = actionLoading === m.objectId;
            return (
              <div key={m.objectId} className="am-card"
                style={{ animationDelay: `${i * 45}ms` }}>

                {/* Manager badge top-right */}
                <div className="am-card-badge">⬡ Manager</div>

                {/* Avatar */}
                <div className="am-card-av-wrap">
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.username} className="am-card-av" />
                  ) : (
                    <div className="am-card-av am-card-av--init" style={{ background: clr }}>
                      {getInitial(m.name)}
                    </div>
                  )}
                  <div className="am-card-av-ring" style={{ borderColor: clr + "55" }} />
                  <div className="am-card-av-dot" style={{ background: clr }} />
                </div>

                {/* Info */}
                <div className="am-card-info">
                  <p className="am-card-name">{m.name}</p>
                  <p className="am-card-uname">@{m.username}</p>
                  {m.country && <p className="am-card-country">◎ {m.country}</p>}
                </div>

                {/* UID + time */}
                <div className="am-card-meta">
                  <div className="am-card-meta-row">
                    <span className="am-meta-key">UID</span>
                    <span className="am-meta-val">{m.uid.slice(-12)}</span>
                  </div>
                  <div className="am-card-meta-row">
                    <span className="am-meta-key">Added</span>
                    <span className="am-meta-val">{timeAgo(m.createdAt)}</span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  className="am-remove-btn"
                  onClick={() => handleRemove(m)}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="am-btn-spin" /> : "✕ Remove Manager"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`am-list-wrap ${animated ? "is-animated" : ""}`}>
          <div className="am-list-head">
            <span style={{ width: 48, flexShrink: 0 }} />
            <span className="am-list-hcol am-list-hcol--grow">Name / Username</span>
            <span className="am-list-hcol am-list-hcol--hide-sm">UID</span>
            <span className="am-list-hcol am-list-hcol--hide-md">Country</span>
            <span className="am-list-hcol am-list-hcol--hide-md">Added</span>
            <span className="am-list-hcol am-list-hcol--right">Action</span>
          </div>

          {pageItems.map((m, i) => {
            const clr       = getAvatarColor(m.username);
            const isLoading = actionLoading === m.objectId;
            return (
              <div key={m.objectId} className="am-list-row"
                style={{ animationDelay: `${i * 30}ms` }}>

                {/* Avatar */}
                <div className="am-list-av-wrap">
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.username} className="am-list-av" />
                  ) : (
                    <div className="am-list-av am-list-av--init" style={{ background: clr }}>
                      {getInitial(m.name)}
                    </div>
                  )}
                </div>

                {/* Name + username */}
                <div className="am-list-cell am-list-cell--grow">
                  <span className="am-list-name">{m.name}</span>
                  <span className="am-list-uname">@{m.username}</span>
                </div>

                {/* UID */}
                <div className="am-list-cell am-list-cell--hide-sm">
                  <span className="am-list-uid">{m.uid}</span>
                </div>

                {/* Country */}
                <div className="am-list-cell am-list-cell--hide-md">
                  <span className="am-list-text">{m.country || "—"}</span>
                </div>

                {/* Time */}
                <div className="am-list-cell am-list-cell--hide-md">
                  <span className="am-list-time">{timeAgo(m.createdAt)}</span>
                </div>

                {/* Action */}
                <div className="am-list-cell am-list-cell--right">
                  <button
                    className="am-remove-btn am-remove-btn--sm"
                    onClick={() => handleRemove(m)}
                    disabled={isLoading}
                  >
                    {isLoading ? <span className="am-btn-spin" /> : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="am-pagination">
          <button className="am-page-btn am-page-nav"
            disabled={page === 0} onClick={() => changePage(0)}>«</button>
          <button className="am-page-btn am-page-nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <>
              <button className="am-page-btn" onClick={() => changePage(0)}>1</button>
              {pageRange[0] > 1 && <span className="am-page-ellipsis">…</span>}
            </>
          )}

          {pageRange.map(i => (
            <button key={i}
              className={`am-page-btn am-page-num ${page === i ? "is-active" : ""}`}
              onClick={() => changePage(i)}
            >{i + 1}</button>
          ))}

          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>
              {pageRange[pageRange.length - 1] < totalPages - 2 && <span className="am-page-ellipsis">…</span>}
              <button className="am-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button>
            </>
          )}

          <button className="am-page-btn am-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="am-page-btn am-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)}>»</button>

          <span className="am-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}