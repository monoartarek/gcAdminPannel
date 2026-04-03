import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeReseller.css";

const PAGE_SIZE = 25;

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
function getRoleStyle(role) {
  if (role === "reseller") return { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  text: "#fbbf24" };
  if (role === "manager")  return { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)",  text: "#34d399" };
  return                          { bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.35)", text: "#818cf8" };
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
export default function MakeReseller() {
  const [users,         setUsers]         = useState([]);
  const [search,        setSearch]        = useState("");
  const [searchInput,   setSearchInput]   = useState(""); // debounced
  const [roleFilter,    setRoleFilter]    = useState("all");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);

  /* stat counts — fetched separately via count() */
  const [statCounts, setStatCounts] = useState({
    total: 0, user: 0, reseller: 0, manager: 0,
  });

  /* coin modal state */
  const [coinModal, setCoinModal] = useState(null);
  const [coinInput, setCoinInput] = useState("");
  const [coinError, setCoinError] = useState("");

  /* reseller confirm modal */
  const [resellerModal, setResellerModal] = useState(null);

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── debounce search input ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ────────────────────────────────────────────────
     FETCH STAT COUNTS — 4 count() queries in parallel
     These are cheap: no records transferred
  ──────────────────────────────────────────────── */
  const fetchStatCounts = useCallback(async () => {
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };
      const qTotal    = new Parse.Query(User);
      const qUser     = new Parse.Query(User); qUser.equalTo("role", "user");
      const qReseller = new Parse.Query(User); qReseller.equalTo("role", "reseller");
      const qManager  = new Parse.Query(User); qManager.equalTo("role", "manager");
      const [total, user, reseller, manager] = await Promise.all([
        qTotal.count(mk),
        qUser.count(mk),
        qReseller.count(mk),
        qManager.count(mk),
      ]);
      setStatCounts({ total, user, reseller, manager });
    } catch (err) {
      console.error("Stat count error:", err);
    }
  }, []);

  /* ────────────────────────────────────────────────
     FETCH PAGE — only PAGE_SIZE users at a time
     Applies role filter + search server-side
  ──────────────────────────────────────────────── */
  const fetchPage = useCallback(async (pageNum, roleF, searchQ) => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };

      /* build base query */
const buildQuery = () => {
  const User = Parse.Object.extend("_User");
  const trimmed = searchQ.trim();

  if (trimmed) {
    const queries = [];

    // name — string, contains works
    const byName = new Parse.Query(User);
    byName.contains("name", trimmed);
    if (roleF !== "all") byName.equalTo("role", roleF);
    queries.push(byName);

    // username — string, contains works
    const byUsername = new Parse.Query(User);
    byUsername.contains("username", trimmed);
    if (roleF !== "all") byUsername.equalTo("role", roleF);
    queries.push(byUsername);

    // uid — number, only equalTo works (only if input is a valid integer)
    const uidNum = parseInt(trimmed);
    if (!isNaN(uidNum)) {
      const byUid = new Parse.Query(User);
      byUid.equalTo("uid", uidNum);
      if (roleF !== "all") byUid.equalTo("role", roleF);
      queries.push(byUid);
    }

    return Parse.Query.or(...queries);
  }

  // no search — simple query
  const q = new Parse.Query(User);
  if (roleF !== "all") q.equalTo("role", roleF);
  return q;
};

      const q = buildQuery();
      q.descending("createdAt");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select("uid","name","username","gender","rCoin","coins","role","avatar");

      const countQ = buildQuery();

      const [batch, count] = await Promise.all([
        q.find(mk),
        countQ.count(mk),
      ]);

      setTotalCount(count);
      setUsers(batch.map(u => {
        const avatarRaw = u.get("avatar");
        let avatarUrl   = null;
        if (avatarRaw && typeof avatarRaw.url === "function") avatarUrl = avatarRaw.url();
        else if (typeof avatarRaw === "string") avatarUrl = avatarRaw;
        return {
          objectId: u.id,
          uid:      String(u.get("uid") || u.id),
          name:     u.get("name")     || "—",
          username: u.get("username") || "anonymous",
          gender:   u.get("gender")   || "—",
          rCoin:    u.get("rCoin")    || 0,
          coins:    u.get("coins")    || 0,
          role:     u.get("role")     || "user",
          avatar:   avatarUrl,
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

  /* re-fetch whenever page / filter / search changes */
  useEffect(() => {
    fetchPage(page, roleFilter, search);
  }, [page, roleFilter, search, fetchPage]);

  /* fetch stat counts once on mount */
  useEffect(() => {
    fetchStatCounts();
  }, [fetchStatCounts]);

  /* ── pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const pageRange = useMemo(() => {
    const delta = 2, range = [];
    for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++)
      range.push(i);
    return range;
  }, [page, totalPages]);

  const changePage = n => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeRole = key => {
    setRoleFilter(key);
    setPage(0);
  };

  /* ── coin update ── */
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
      setUsers(list => list.map(u =>
        u.objectId === user.objectId ? { ...u, coins: newCoins } : u
      ));
      showToast(
        `${user.username}: coins ${type === "inc" ? "+" : "-"}${amount} → ${newCoins}`,
        type === "inc" ? "success" : "info"
      );
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── reseller toggle ── */
  const confirmReseller = async () => {
    if (!resellerModal) return;
    const user    = resellerModal;
    const newRole = user.role === "reseller" ? "user" : "reseller";
    setResellerModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const q    = new Parse.Query(User);
      const obj  = await q.get(user.objectId, { useMasterKey: true });
      obj.set("role", newRole);
      await obj.save(null, { useMasterKey: true });
      setUsers(list => list.map(u =>
        u.objectId === user.objectId ? { ...u, role: newRole } : u
      ));
      /* refresh stat counts after role change */
      fetchStatCounts();
      showToast(
        newRole === "reseller"
          ? `${user.username} is now a Reseller`
          : `${user.username} role changed to User`,
        newRole === "reseller" ? "success" : "info"
      );
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="rs-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`rs-toast rs-toast--${toast.type}`}>
          <span className="rs-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : toast.type === "copy" ? "⎘" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Coin Modal ── */}
      {coinModal && (
        <div className="rs-overlay" onClick={() => setCoinModal(null)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <div className="rs-modal-icon"
              style={{ background: coinModal.type === "inc" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)" }}>
              {coinModal.type === "inc" ? "+" : "−"}
            </div>
            <h3 className="rs-modal-title">
              {coinModal.type === "inc" ? "Add Coins" : "Deduct Coins"}
            </h3>
            <p className="rs-modal-body">
              {coinModal.type === "inc" ? "Add coins to" : "Deduct coins from"}{" "}
              <strong>@{coinModal.user.username}</strong>
              <br />
              <span className="rs-modal-current">
                Current balance: <b>{coinModal.user.coins.toLocaleString()}</b>
              </span>
            </p>
            <div className="rs-coin-input-wrap">
              <input
                className={`rs-coin-input ${coinError ? "is-error" : ""}`}
                type="number" min="1"
                placeholder="Enter amount…"
                value={coinInput}
                autoFocus
                onChange={e => { setCoinInput(e.target.value); setCoinError(""); }}
                onKeyDown={e => e.key === "Enter" && confirmCoin()}
              />
              {coinError && <span className="rs-coin-error">{coinError}</span>}
            </div>
            <div className="rs-modal-actions">
              <button className="rs-modal-cancel" onClick={() => setCoinModal(null)}>Cancel</button>
              <button
                className={`rs-modal-confirm ${coinModal.type === "inc" ? "is-green" : "is-red"}`}
                onClick={confirmCoin}>
                {coinModal.type === "inc" ? "Add Coins" : "Deduct Coins"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reseller Confirm Modal ── */}
      {resellerModal && (
        <div className="rs-overlay" onClick={() => setResellerModal(null)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <div className="rs-modal-icon" style={{ background: "rgba(251,191,36,0.15)" }}>◈</div>
            <h3 className="rs-modal-title">
              {resellerModal.role === "reseller" ? "Remove Reseller" : "Make Reseller"}
            </h3>
            <p className="rs-modal-body">
              {resellerModal.role === "reseller"
                ? <>Remove reseller role from <strong>@{resellerModal.username}</strong>?</>
                : <>Grant reseller role to <strong>@{resellerModal.username}</strong>?</>
              }
            </p>
            <div className="rs-modal-actions">
              <button className="rs-modal-cancel" onClick={() => setResellerModal(null)}>Cancel</button>
              <button
                className={`rs-modal-confirm ${resellerModal.role === "reseller" ? "is-red" : "is-amber"}`}
                onClick={confirmReseller}>
                {resellerModal.role === "reseller" ? "Yes, Remove" : "Yes, Make Reseller"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="rs-header">
        <div className="rs-header-left">
          <span className="rs-eyebrow">Coin & Role Management</span>
          <h1 className="rs-title">Reseller Control</h1>
          <span className="rs-subtitle">
            {loading
              ? "Loading…"
              : `${statCounts.total.toLocaleString()} users · ${statCounts.reseller} resellers · showing ${users.length} of ${totalCount}`
            }
          </span>
        </div>
        <div className="rs-header-right">
          <div className="rs-view-toggle">
            <button className={`rs-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`rs-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
          <button className="rs-refresh-btn"
            onClick={() => { fetchPage(page, roleFilter, search); fetchStatCounts(); }}
            disabled={loading}>
            {loading ? <span className="rs-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="rs-stat-pills">
        {[
          { label: "Total",     val: statCounts.total,    color: "violet", key: "all"      },
          { label: "Users",     val: statCounts.user,     color: "blue",   key: "user"     },
          { label: "Resellers", val: statCounts.reseller, color: "amber",  key: "reseller" },
          { label: "Managers",  val: statCounts.manager,  color: "green",  key: "manager"  },
        ].map((s, i) => (
          <button key={s.key}
            className={`rs-stat-pill rs-stat-pill--${s.color} ${roleFilter === s.key ? "is-active" : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => changeRole(s.key)}>
            <span className="rs-stat-val">{s.val.toLocaleString()}</span>
            <span className="rs-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="rs-toolbar">
        <div className="rs-search-wrap">
          <span className="rs-search-icon">⌕</span>
          <input className="rs-search"
            placeholder="Search name, username or UID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="rs-search-clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <span className="rs-result-count">
          {!loading && `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Page indicator ── */}
      {!loading && totalPages > 1 && (
        <div className="rs-page-indicator">
          <span>Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></span>
          <span className="rs-page-indicator-dot" />
          <span>Showing records <strong>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong></span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="rs-loading">
          <div className="rs-spinner-wrap">
            <div className="rs-spinner" />
            <div className="rs-spinner rs-spinner--2" />
          </div>
          <p>Fetching users…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rs-empty">
          <div className="rs-empty-icon">◎</div>
          <p>No users found</p>
          <button className="rs-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`rs-card-grid ${animated ? "is-animated" : ""}`}>
          {users.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="rs-card" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="rs-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="rs-card-av" />
                    : <div className="rs-card-av rs-card-av--init" style={{ background: avatarClr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="rs-card-av-ring" style={{ borderColor: avatarClr + "55" }} />
                </div>
                <div className="rs-card-info">
                  <p className="rs-card-name">{user.name}</p>
                  <p className="rs-card-uname rs-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username">@{user.username}</p>
                  <span className="rs-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}>
                    {user.role}
                  </span>
                </div>
                <div className="rs-card-uid rs-copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)} title="Click to copy UID">
                  <span className="rs-uid-label">UID</span>
                  <span className="rs-uid-val">{user.uid}</span>
                  <span className="rs-copy-icon">⎘</span>
                </div>
                <div className="rs-card-coins">
                  <div className="rs-coin-item">
                    <span className="rs-coin-label">Coins</span>
                    <span className="rs-coin-val rs-coin-val--gold">{user.coins.toLocaleString()}</span>
                  </div>
                  <div className="rs-coin-divider" />
                  <div className="rs-coin-item">
                    <span className="rs-coin-label">R-Coin</span>
                    <span className="rs-coin-val rs-coin-val--violet">{user.rCoin.toLocaleString()}</span>
                  </div>
                </div>
                <div className="rs-card-coin-btns">
                  <button className="rs-coin-btn rs-coin-btn--plus"
                    disabled={isLoading} onClick={() => openCoinModal(user, "inc")}>
                    {isLoading ? <span className="rs-btn-spin" /> : "+ Add"}
                  </button>
                  <button className="rs-coin-btn rs-coin-btn--minus"
                    disabled={isLoading} onClick={() => openCoinModal(user, "dec")}>
                    {isLoading ? <span className="rs-btn-spin" /> : "− Deduct"}
                  </button>
                </div>
                <button
                  className={`rs-action-btn ${user.role === "reseller" ? "is-demote" : "is-promote"}`}
                  disabled={isLoading} onClick={() => setResellerModal(user)}>
                  {isLoading
                    ? <span className="rs-btn-spin" />
                    : user.role === "reseller" ? "✕ Remove Reseller" : "◈ Make Reseller"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`rs-list-wrap ${animated ? "is-animated" : ""}`}>
          <div className="rs-list-head">
            <span style={{ width: 48, flexShrink: 0 }} />
            <span className="rs-list-hcol rs-list-hcol--grow">Name / Username</span>
            <span className="rs-list-hcol rs-list-hcol--hide-sm">UID</span>
            <span className="rs-list-hcol rs-list-hcol--hide-md">Gender</span>
            <span className="rs-list-hcol">Coins</span>
            <span className="rs-list-hcol rs-list-hcol--hide-sm">R-Coin</span>
            <span className="rs-list-hcol">Role</span>
            <span className="rs-list-hcol rs-list-hcol--right">Actions</span>
          </div>
          {users.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="rs-list-row" style={{ animationDelay: `${i * 28}ms` }}>
                <div className="rs-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="rs-list-av" />
                    : <div className="rs-list-av rs-list-av--init" style={{ background: avatarClr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                </div>
                <div className="rs-list-cell rs-list-cell--grow">
                  <span className="rs-list-name">{user.name}</span>
                  <span className="rs-list-uname rs-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username">@{user.username}</span>
                </div>
                <div className="rs-list-cell rs-list-cell--hide-sm">
                  <span className="rs-list-uid rs-copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}
                    title="Click to copy UID">{user.uid} <span className="rs-copy-icon">⎘</span></span>
                </div>
                <div className="rs-list-cell rs-list-cell--hide-md">
                  <span className="rs-list-text">{user.gender}</span>
                </div>
                <div className="rs-list-cell">
                  <span className="rs-list-coin rs-list-coin--gold">{user.coins.toLocaleString()}</span>
                </div>
                <div className="rs-list-cell rs-list-cell--hide-sm">
                  <span className="rs-list-coin rs-list-coin--violet">{user.rCoin.toLocaleString()}</span>
                </div>
                <div className="rs-list-cell">
                  <span className="rs-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}>
                    {user.role}
                  </span>
                </div>
                <div className="rs-list-cell rs-list-cell--right rs-list-actions">
                  <button className="rs-coin-btn rs-coin-btn--plus rs-coin-btn--sm"
                    disabled={isLoading} onClick={() => openCoinModal(user, "inc")} title="Add coins">
                    {isLoading ? <span className="rs-btn-spin" /> : "+"}
                  </button>
                  <button className="rs-coin-btn rs-coin-btn--minus rs-coin-btn--sm"
                    disabled={isLoading} onClick={() => openCoinModal(user, "dec")} title="Deduct coins">
                    {isLoading ? <span className="rs-btn-spin" /> : "−"}
                  </button>
                  <button
                    className={`rs-action-btn rs-action-btn--sm ${user.role === "reseller" ? "is-demote" : "is-promote"}`}
                    disabled={isLoading} onClick={() => setResellerModal(user)}>
                    {isLoading
                      ? <span className="rs-btn-spin" />
                      : user.role === "reseller" ? "Remove" : "Reseller"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="rs-pagination">
          <button className="rs-page-btn rs-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(0)}>«</button>
          <button className="rs-page-btn rs-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <><button className="rs-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="rs-page-ellipsis">…</span>}</>
          )}

          {pageRange.map(i => (
            <button key={i}
              className={`rs-page-btn rs-page-num ${page === i ? "is-active" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}

          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 && <span className="rs-page-ellipsis">…</span>}
            <button className="rs-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="rs-page-btn rs-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="rs-page-btn rs-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(totalPages - 1)}>»</button>

          <span className="rs-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}