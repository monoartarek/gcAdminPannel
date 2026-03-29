import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AllResellers.css";

const PAGE_SIZE = 12;

/* ── helpers ── */
function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}
function getAvatarColor(str) {
  const palette = [
    "#fbbf24","#f472b6","#34d399","#60a5fa",
    "#a78bfa","#22d3ee","#f87171","#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text).then(() => {
    showToast(`Copied: ${text}`, "copy");
  }).catch(() => {
    /* fallback for older browsers */
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast(`Copied: ${text}`, "copy");
  });
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

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AllResellers() {
  const [users,         setUsers]         = useState([]);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);
  const [sortBy,        setSortBy]        = useState("newest");

  /* modals */
  const [coinModal,    setCoinModal]    = useState(null); // { user, type }
  const [coinInput,    setCoinInput]    = useState("");
  const [coinError,    setCoinError]    = useState("");
  const [removeModal,  setRemoveModal]  = useState(null);

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── fetch resellers only ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      q.equalTo("role", "reseller");
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
          gender:    u.get("gender")   || "—",
          rCoin:     u.get("rCoin")    || 0,
          coins:     u.get("coins")    || 0,
          role:      "reseller",
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
    if (sortBy === "coins")   list.sort((a, b) => b.coins - a.coins);
    if (sortBy === "rcoins")  list.sort((a, b) => b.rCoin - a.rCoin);
    if (sortBy === "oldest")  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return list;
  }, [users, search, sortBy]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── coin modal ── */
  const openCoinModal = (user, type) => {
    setCoinModal({ user, type });
    setCoinInput("");
    setCoinError("");
  };

  const confirmCoin = async () => {
    const amount = parseInt(coinInput);
    if (!coinInput || isNaN(amount) || amount <= 0) {
      setCoinError("Enter a valid positive number");
      return;
    }
    const { user, type } = coinModal;
    const newCoins = type === "inc"
      ? user.coins + amount
      : Math.max(0, user.coins - amount);

    setCoinModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      const obj  = await q.get(user.objectId, { useMasterKey: true });
      obj.set("coins", newCoins);
      await obj.save(null, { useMasterKey: true });

      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, coins: newCoins } : u
      ));
      showToast(
        `${user.username}: ${type === "inc" ? "+" : "-"}${amount} coins → ${newCoins}`,
        type === "inc" ? "success" : "info"
      );
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── remove reseller ── */
  const confirmRemove = async () => {
    if (!removeModal) return;
    const user = removeModal;
    setRemoveModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      const obj  = await q.get(user.objectId, { useMasterKey: true });
      obj.set("role", "user");
      await obj.save(null, { useMasterKey: true });

      setUsers(prev => prev.filter(u => u.objectId !== user.objectId));
      if ((page + 1) * PAGE_SIZE > users.length - 1 && page > 0) setPage(page - 1);
      showToast(`${user.username} removed from resellers`, "info");
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
    <div className="ar-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`ar-toast ar-toast--${toast.type}`}>
          <span className="ar-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : toast.type === "copy" ? "⎘" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Coin Modal ── */}
      {coinModal && (
        <div className="ar-overlay" onClick={() => setCoinModal(null)}>
          <div className="ar-modal" onClick={e => e.stopPropagation()}>
            <div className="ar-modal-icon"
              style={{ background: coinModal.type === "inc" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)" }}>
              <span style={{ color: coinModal.type === "inc" ? "#34d399" : "#f87171", fontSize: 22, fontWeight: 700 }}>
                {coinModal.type === "inc" ? "+" : "−"}
              </span>
            </div>
            <h3 className="ar-modal-title">
              {coinModal.type === "inc" ? "Add Coins" : "Deduct Coins"}
            </h3>
            <p className="ar-modal-body">
              {coinModal.type === "inc" ? "Add coins to" : "Deduct coins from"}{" "}
              <strong>@{coinModal.user.username}</strong>
              <span className="ar-modal-current">
                Current balance: <b>{coinModal.user.coins.toLocaleString()}</b>
              </span>
            </p>
            <div className="ar-coin-input-wrap">
              <input
                className={`ar-coin-input ${coinError ? "is-error" : ""}`}
                type="number" min="1" placeholder="Enter amount…"
                value={coinInput} autoFocus
                onChange={e => { setCoinInput(e.target.value); setCoinError(""); }}
                onKeyDown={e => e.key === "Enter" && confirmCoin()}
              />
              {coinError && <span className="ar-coin-error">{coinError}</span>}
            </div>
            <div className="ar-modal-actions">
              <button className="ar-modal-cancel" onClick={() => setCoinModal(null)}>Cancel</button>
              <button
                className={`ar-modal-confirm ${coinModal.type === "inc" ? "is-green" : "is-red"}`}
                onClick={confirmCoin}>
                {coinModal.type === "inc" ? "Add Coins" : "Deduct Coins"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirm Modal ── */}
      {removeModal && (
        <div className="ar-overlay" onClick={() => setRemoveModal(null)}>
          <div className="ar-modal" onClick={e => e.stopPropagation()}>
            <div className="ar-modal-icon" style={{ background: "rgba(248,113,113,0.15)" }}>
              <span style={{ color: "#f87171", fontSize: 22 }}>✕</span>
            </div>
            <h3 className="ar-modal-title">Remove Reseller</h3>
            <p className="ar-modal-body">
              Remove reseller role from <strong>@{removeModal.username}</strong>?
              They will become a regular user.
            </p>
            <div className="ar-modal-actions">
              <button className="ar-modal-cancel" onClick={() => setRemoveModal(null)}>Cancel</button>
              <button className="ar-modal-confirm is-red" onClick={confirmRemove}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="ar-header">
        <div className="ar-header-left">
          <span className="ar-eyebrow">Reseller Management</span>
          <h1 className="ar-title">All Resellers</h1>
          <span className="ar-subtitle">
            {loading ? "…" : `${users.length.toLocaleString()} reseller${users.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="ar-header-right">
          <div className="ar-view-toggle">
            <button className={`ar-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`ar-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
          <button className="ar-refresh-btn" onClick={fetchUsers} disabled={loading}>
            {loading ? <span className="ar-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="ar-hero">
        <div className="ar-hero-left">
          <div className="ar-hero-num">{loading ? "…" : users.length.toLocaleString()}</div>
          <div className="ar-hero-label">Active Resellers</div>
        </div>
        <div className="ar-hero-right">
          <div className="ar-hero-stat">
            <span className="ar-hero-stat-val ar-hero-stat-val--gold">
              {loading ? "…" : users.reduce((s, u) => s + u.coins, 0).toLocaleString()}
            </span>
            <span className="ar-hero-stat-label">Total Coins</span>
          </div>
          <div className="ar-hero-stat">
            <span className="ar-hero-stat-val ar-hero-stat-val--violet">
              {loading ? "…" : users.reduce((s, u) => s + u.rCoin, 0).toLocaleString()}
            </span>
            <span className="ar-hero-stat-label">Total R-Coins</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="ar-toolbar">
        <div className="ar-search-wrap">
          <span className="ar-search-icon">⌕</span>
          <input className="ar-search"
            placeholder="Search by name, username or UID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && (
            <button className="ar-search-clear" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <select className="ar-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">By Name</option>
          <option value="coins">Most Coins</option>
          <option value="rcoins">Most R-Coins</option>
        </select>
        <span className="ar-result-count">
          {loading ? "" : `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="ar-loading">
          <div className="ar-spinner-wrap">
            <div className="ar-spinner" />
            <div className="ar-spinner ar-spinner--2" />
          </div>
          <p>Fetching resellers…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="ar-empty">
          <div className="ar-empty-icon">◈</div>
          <p>{search ? "No resellers match your search" : "No resellers found"}</p>
          {search && (
            <button className="ar-empty-reset"
              onClick={() => { setSearch(""); setPage(0); }}>Clear search</button>
          )}
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`ar-card-grid ${animated ? "is-animated" : ""}`}>
          {pageItems.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="ar-card"
                style={{ animationDelay: `${i * 45}ms` }}>

                <div className="ar-card-badge">◈ Reseller</div>

                {/* Avatar */}
                <div className="ar-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="ar-card-av" />
                    : <div className="ar-card-av ar-card-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="ar-card-av-ring" style={{ borderColor: clr + "55" }} />
                  <div className="ar-card-av-dot" style={{ background: clr }} />
                </div>

                {/* Info */}
                <div className="ar-card-info">
                  <p className="ar-card-name">{user.name}</p>
                  <p
                    className="ar-card-uname ar-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username"
                  >@{user.username}</p>
                  {user.gender !== "—" && <p className="ar-card-gender">{user.gender}</p>}
                </div>

                {/* UID chip */}
                <div
                  className="ar-card-uid ar-copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)}
                  title="Click to copy UID"
                >
                  <span className="ar-uid-label">UID</span>
                  <span className="ar-uid-val">{user.uid}</span>
                  <span className="ar-copy-icon">⎘</span>
                </div>

                {/* Coin strip */}
                <div className="ar-card-coins">
                  <div className="ar-coin-item">
                    <span className="ar-coin-label">Coins</span>
                    <span className="ar-coin-val ar-coin-val--gold">{user.coins.toLocaleString()}</span>
                  </div>
                  <div className="ar-coin-divider" />
                  <div className="ar-coin-item">
                    <span className="ar-coin-label">R-Coin</span>
                    <span className="ar-coin-val ar-coin-val--violet">{user.rCoin.toLocaleString()}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="ar-card-time">{timeAgo(user.createdAt)}</div>

                {/* Coin buttons */}
                <div className="ar-card-coin-btns">
                  <button className="ar-coin-btn ar-coin-btn--plus"
                    disabled={isLoading} onClick={() => openCoinModal(user, "inc")}>
                    {isLoading ? <span className="ar-btn-spin" /> : "+ Add"}
                  </button>
                  <button className="ar-coin-btn ar-coin-btn--minus"
                    disabled={isLoading} onClick={() => openCoinModal(user, "dec")}>
                    {isLoading ? <span className="ar-btn-spin" /> : "− Deduct"}
                  </button>
                </div>

                {/* Remove */}
                <button className="ar-remove-btn" disabled={isLoading}
                  onClick={() => setRemoveModal(user)}>
                  {isLoading ? <span className="ar-btn-spin" /> : "✕ Remove Reseller"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`ar-list-wrap ${animated ? "is-animated" : ""}`}>
          <div className="ar-list-head">
            <span style={{ width: 48, flexShrink: 0 }} />
            <span className="ar-list-hcol ar-list-hcol--grow">Name / Username</span>
            <span className="ar-list-hcol ar-list-hcol--hide-sm">UID</span>
            <span className="ar-list-hcol ar-list-hcol--hide-md">Gender</span>
            <span className="ar-list-hcol">Coins</span>
            <span className="ar-list-hcol ar-list-hcol--hide-sm">R-Coin</span>
            <span className="ar-list-hcol ar-list-hcol--hide-md">Added</span>
            <span className="ar-list-hcol ar-list-hcol--right">Actions</span>
          </div>

          {pageItems.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="ar-list-row"
                style={{ animationDelay: `${i * 28}ms` }}>

                {/* Avatar */}
                <div className="ar-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="ar-list-av" />
                    : <div className="ar-list-av ar-list-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                </div>

                {/* Name */}
                <div className="ar-list-cell ar-list-cell--grow">
                  <span className="ar-list-name">{user.name}</span>
                  <span
                    className="ar-list-uname ar-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username"
                  >@{user.username}</span>
                </div>

                {/* UID */}
                <div className="ar-list-cell ar-list-cell--hide-sm">
                  <span
                    className="ar-list-uid ar-copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}
                    title="Click to copy UID"
                  >{user.uid} <span className="ar-copy-icon">⎘</span></span>
                </div>

                {/* Gender */}
                <div className="ar-list-cell ar-list-cell--hide-md">
                  <span className="ar-list-text">{user.gender}</span>
                </div>

                {/* Coins */}
                <div className="ar-list-cell">
                  <span className="ar-list-coin ar-list-coin--gold">{user.coins.toLocaleString()}</span>
                </div>

                {/* R-Coin */}
                <div className="ar-list-cell ar-list-cell--hide-sm">
                  <span className="ar-list-coin ar-list-coin--violet">{user.rCoin.toLocaleString()}</span>
                </div>

                {/* Added */}
                <div className="ar-list-cell ar-list-cell--hide-md">
                  <span className="ar-list-time">{timeAgo(user.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="ar-list-cell ar-list-cell--right ar-list-actions">
                  <button className="ar-coin-btn ar-coin-btn--plus ar-coin-btn--sm"
                    disabled={isLoading} onClick={() => openCoinModal(user, "inc")} title="Add coins">
                    {isLoading ? <span className="ar-btn-spin" /> : "+"}
                  </button>
                  <button className="ar-coin-btn ar-coin-btn--minus ar-coin-btn--sm"
                    disabled={isLoading} onClick={() => openCoinModal(user, "dec")} title="Deduct coins">
                    {isLoading ? <span className="ar-btn-spin" /> : "−"}
                  </button>
                  <button className="ar-remove-btn ar-remove-btn--sm"
                    disabled={isLoading} onClick={() => setRemoveModal(user)}>
                    {isLoading ? <span className="ar-btn-spin" /> : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="ar-pagination">
          <button className="ar-page-btn ar-page-nav"
            disabled={page === 0} onClick={() => changePage(0)}>«</button>
          <button className="ar-page-btn ar-page-nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <><button className="ar-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="ar-page-ellipsis">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`ar-page-btn ar-page-num ${page === i ? "is-active" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 && <span className="ar-page-ellipsis">…</span>}
            <button className="ar-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="ar-page-btn ar-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="ar-page-btn ar-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)}>»</button>
          <span className="ar-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}