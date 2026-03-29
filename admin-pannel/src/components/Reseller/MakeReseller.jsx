import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeReseller.css";

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
  const [users,        setUsers]        = useState([]);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [actionLoading,setActionLoading]= useState(null);
  const [page,         setPage]         = useState(0);
  const [viewMode,     setViewMode]     = useState("list");
  const [toast,        setToast]        = useState(null);
  const [animated,     setAnimated]     = useState(false);

  /* coin modal state */
  const [coinModal, setCoinModal] = useState(null); // { user, type: "inc"|"dec" }
  const [coinInput, setCoinInput] = useState("");
  const [coinError, setCoinError] = useState("");

  /* reseller confirm modal */
  const [resellerModal, setResellerModal] = useState(null);

  /* ── toast ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── fetch ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      let all = [], skip = 0;
      const limit = 1000;
      while (true) {
        const q = new Parse.Query(User);
        q.limit(limit);
        q.skip(skip);
        q.descending("createdAt");
        q.select("uid","name","username","gender","rCoin","coins","role","avatar");
        const batch = await q.find({ useMasterKey: true });
        if (batch.length === 0) break;

        all = [...all, ...batch.map(u => {
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
        })];
        if (batch.length < limit) break;
        skip += limit;
      }
      setUsers(all);
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

  /* ── filter ── */
  const displayed = useMemo(() => {
    let list = [...users];
    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.uid.toLowerCase().includes(q)      ||
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, search, roleFilter]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── stats ── */
  const resellerCount = users.filter(u => u.role === "reseller").length;

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

      const update = list => list.map(u =>
        u.objectId === user.objectId ? { ...u, coins: newCoins } : u
      );
      setUsers(update);
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

      const update = list => list.map(u =>
        u.objectId === user.objectId ? { ...u, role: newRole } : u
      );
      setUsers(update);
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
                type="number"
                min="1"
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
                onClick={confirmCoin}
              >
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
                onClick={confirmReseller}
              >
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
            {loading ? "…" : `${users.length.toLocaleString()} users · ${resellerCount} resellers`}
          </span>
        </div>
        <div className="rs-header-right">
          <div className="rs-view-toggle">
            <button className={`rs-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}>≡ List</button>
            <button className={`rs-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}>⊞ Cards</button>
          </div>
          <button className="rs-refresh-btn" onClick={fetchUsers} disabled={loading}>
            {loading ? <span className="rs-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="rs-stat-pills">
        {[
          { label: "Total",     val: users.length,                                 color: "violet", key: "all"      },
          { label: "Users",     val: users.filter(u => u.role === "user").length,  color: "blue",   key: "user"     },
          { label: "Resellers", val: resellerCount,                                color: "amber",  key: "reseller" },
          { label: "Managers",  val: users.filter(u => u.role === "manager").length, color: "green", key: "manager" },
        ].map((s, i) => (
          <button key={s.key}
            className={`rs-stat-pill rs-stat-pill--${s.color} ${roleFilter === s.key ? "is-active" : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => { setRoleFilter(s.key); setPage(0); }}>
            <span className="rs-stat-val">{loading ? "…" : s.val.toLocaleString()}</span>
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
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && (
            <button className="rs-search-clear" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <span className="rs-result-count">
          {loading ? "" : `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="rs-loading">
          <div className="rs-spinner-wrap">
            <div className="rs-spinner" />
            <div className="rs-spinner rs-spinner--2" />
          </div>
          <p>Fetching users…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rs-empty">
          <div className="rs-empty-icon">◎</div>
          <p>No users found</p>
          <button className="rs-empty-reset"
            onClick={() => { setSearch(""); setRoleFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`rs-card-grid ${animated ? "is-animated" : ""}`}>
          {pageItems.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="rs-card"
                style={{ animationDelay: `${i * 40}ms` }}>

                {/* Avatar */}
                <div className="rs-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="rs-card-av" />
                    : <div className="rs-card-av rs-card-av--init" style={{ background: avatarClr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="rs-card-av-ring" style={{ borderColor: avatarClr + "55" }} />
                </div>

                {/* Info */}
                <div className="rs-card-info">
                  <p className="rs-card-name">{user.name}</p>
                  <p
                    className="rs-card-uname rs-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username"
                  >@{user.username}</p>
                  <span className="rs-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}>
                    {user.role}
                  </span>
                </div>

                {/* UID chip */}
                <div
                  className="rs-card-uid rs-copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)}
                  title="Click to copy UID"
                >
                  <span className="rs-uid-label">UID</span>
                  <span className="rs-uid-val">{user.uid}</span>
                  <span className="rs-copy-icon">⎘</span>
                </div>

                {/* Coin strip */}
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

                {/* Coin buttons */}
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

                {/* Reseller action */}
                <button
                  className={`rs-action-btn ${user.role === "reseller" ? "is-demote" : "is-promote"}`}
                  disabled={isLoading}
                  onClick={() => setResellerModal(user)}>
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

          {pageItems.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="rs-list-row"
                style={{ animationDelay: `${i * 28}ms` }}>

                {/* Avatar */}
                <div className="rs-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="rs-list-av" />
                    : <div className="rs-list-av rs-list-av--init" style={{ background: avatarClr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                </div>

                {/* Name */}
                <div className="rs-list-cell rs-list-cell--grow">
                  <span className="rs-list-name">{user.name}</span>
                  <span
                    className="rs-list-uname rs-copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Click to copy username"
                  >@{user.username}</span>
                </div>

                {/* UID */}
                <div className="rs-list-cell rs-list-cell--hide-sm">
                  <span
                    className="rs-list-uid rs-copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}
                    title="Click to copy UID"
                  >{user.uid} <span className="rs-copy-icon">⎘</span></span>
                </div>

                {/* Gender */}
                <div className="rs-list-cell rs-list-cell--hide-md">
                  <span className="rs-list-text">{user.gender}</span>
                </div>

                {/* Coins */}
                <div className="rs-list-cell">
                  <span className="rs-list-coin rs-list-coin--gold">{user.coins.toLocaleString()}</span>
                </div>

                {/* R-Coin */}
                <div className="rs-list-cell rs-list-cell--hide-sm">
                  <span className="rs-list-coin rs-list-coin--violet">{user.rCoin.toLocaleString()}</span>
                </div>

                {/* Role */}
                <div className="rs-list-cell">
                  <span className="rs-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}>
                    {user.role}
                  </span>
                </div>

                {/* Actions */}
                <div className="rs-list-cell rs-list-cell--right rs-list-actions">
                  <button className="rs-coin-btn rs-coin-btn--plus rs-coin-btn--sm"
                    disabled={isLoading} onClick={() => openCoinModal(user, "inc")}
                    title="Add coins">
                    {isLoading ? <span className="rs-btn-spin" /> : "+"}
                  </button>
                  <button className="rs-coin-btn rs-coin-btn--minus rs-coin-btn--sm"
                    disabled={isLoading} onClick={() => openCoinModal(user, "dec")}
                    title="Deduct coins">
                    {isLoading ? <span className="rs-btn-spin" /> : "−"}
                  </button>
                  <button
                    className={`rs-action-btn rs-action-btn--sm ${user.role === "reseller" ? "is-demote" : "is-promote"}`}
                    disabled={isLoading}
                    onClick={() => setResellerModal(user)}>
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
            disabled={page === 0} onClick={() => changePage(0)}>«</button>
          <button className="rs-page-btn rs-page-nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹ Prev</button>

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
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="rs-page-btn rs-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)}>»</button>

          <span className="rs-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}