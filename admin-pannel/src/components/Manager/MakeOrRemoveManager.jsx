import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeOrRemoveManager.css";

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
  if (role === "manager") return { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", text: "#34d399" };
  if (role === "admin")   return { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  text: "#fbbf24" };
  return                         { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8" };
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function MakeOrRemoveManager() {
  const [allUsers,     setAllUsers]     = useState([]);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [actionLoading,setActionLoading]= useState(null);
  const [page,         setPage]         = useState(0);
  const [viewMode,     setViewMode]     = useState("list"); // "list" | "card"
  const [toast,        setToast]        = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { user, newRole }
  const [animated,     setAnimated]     = useState(false);

  /* ── toast helper ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── fetch ── */
  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      let allResults = [], skip = 0;
      const limit = 1000;

      while (true) {
        const q = new Parse.Query(User);
        q.limit(limit);
        q.skip(skip);
        q.descending("createdAt");
        q.select("objectId", "uid", "name", "username", "role", "avatar");
        const batch = await q.find({ useMasterKey: true });
        if (batch.length === 0) break;

        const mapped = batch.map(u => {
          const avatarRaw = u.get("avatar");
          let avatarUrl   = null;
          if (avatarRaw && typeof avatarRaw.url === "function") avatarUrl = avatarRaw.url();
          else if (typeof avatarRaw === "string") avatarUrl = avatarRaw;

          return {
            objectId: u.id,
            uid:      String(u.get("uid") || u.id),
            name:     u.get("name")     || "—",
            username: u.get("username") || "anonymous",
            role:     u.get("role")     || "user",
            avatar:   avatarUrl,
          };
        });

        allResults = [...allResults, ...mapped];
        if (batch.length < limit) break;
        skip += limit;
      }

      setAllUsers(allResults);
      setPage(0);
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("Failed to fetch users: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchAllUsers(); }, [fetchAllUsers]);

  /* ── filter + search ── */
  const displayed = useMemo(() => {
    let list = [...allUsers];
    if (roleFilter !== "all")
      list = list.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.uid.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, search, roleFilter]);

  const totalPages    = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems     = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── stats ── */
  const managerCount = allUsers.filter(u => u.role === "manager").length;
  const userCount    = allUsers.filter(u => u.role === "user").length;

  /* ── action (role toggle) ── */
  const handleAction = (user) => {
    const newRole = user.role === "manager" ? "user" : "manager";
    setConfirmModal({ user, newRole });
  };

  const confirmAction = async () => {
    if (!confirmModal) return;
    const { user, newRole } = confirmModal;
    setConfirmModal(null);
    setActionLoading(user.objectId);

    try {
      const User  = Parse.Object.extend("_User");
      const query = new Parse.Query(User);
      const obj   = await query.get(user.objectId, { useMasterKey: true });
      obj.set("role", newRole);
      await obj.save(null, { useMasterKey: true });

      const update = list =>
        list.map(u => u.objectId === user.objectId ? { ...u, role: newRole } : u);
      setAllUsers(update);

      showToast(
        newRole === "manager"
          ? `${user.username} is now a Manager`
          : `${user.username} role changed to User`,
        newRole === "manager" ? "success" : "info"
      );
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
    <div className="mrm-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`mrm-toast mrm-toast--${toast.type}`}>
          <span className="mrm-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="mrm-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="mrm-modal" onClick={e => e.stopPropagation()}>
            <div className="mrm-modal-icon">
              {confirmModal.newRole === "manager" ? "⬡" : "◎"}
            </div>
            <h3 className="mrm-modal-title">
              {confirmModal.newRole === "manager" ? "Make Manager" : "Remove Manager"}
            </h3>
            <p className="mrm-modal-body">
              {confirmModal.newRole === "manager"
                ? <>Grant manager role to <strong>@{confirmModal.user.username}</strong>?</>
                : <>Remove manager role from <strong>@{confirmModal.user.username}</strong>?</>
              }
            </p>
            <div className="mrm-modal-actions">
              <button className="mrm-modal-cancel" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                className={`mrm-modal-confirm ${confirmModal.newRole === "manager" ? "is-promote" : "is-demote"}`}
                onClick={confirmAction}
              >
                {confirmModal.newRole === "manager" ? "Yes, Make Manager" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mrm-header">
        <div className="mrm-header-left">
          <span className="mrm-eyebrow">Role Management</span>
          <h1 className="mrm-title">Manager Control</h1>
          <span className="mrm-subtitle">
            {loading ? "…" : `${allUsers.length.toLocaleString()} users · ${managerCount} managers`}
          </span>
        </div>

        <div className="mrm-header-right">
          {/* View toggle */}
          <div className="mrm-view-toggle">
            <button
              className={`mrm-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >≡ List</button>
            <button
              className={`mrm-toggle-btn ${viewMode === "card" ? "is-active" : ""}`}
              onClick={() => setViewMode("card")}
              title="Card view"
            >⊞ Cards</button>
          </div>

          {/* Refresh */}
          <button
            className="mrm-refresh-btn"
            onClick={fetchAllUsers}
            disabled={loading}
            title="Refresh"
          >
            {loading ? <span className="mrm-btn-spin" /> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="mrm-stat-pills">
        {[
          { label: "Total",    val: allUsers.length, color: "violet", key: "all"     },
          { label: "Users",    val: userCount,       color: "blue",   key: "user"    },
          { label: "Managers", val: managerCount,    color: "green",  key: "manager" },
        ].map((s, i) => (
          <button
            key={s.key}
            className={`mrm-stat-pill mrm-stat-pill--${s.color} ${roleFilter === s.key ? "is-active" : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => { setRoleFilter(s.key); setPage(0); }}
          >
            <span className="mrm-stat-val">{loading ? "…" : s.val.toLocaleString()}</span>
            <span className="mrm-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="mrm-toolbar">
        <div className="mrm-search-wrap">
          <span className="mrm-search-icon">⌕</span>
          <input
            className="mrm-search"
            placeholder="Search by name, username or UID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="mrm-search-clear" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        <span className="mrm-result-count">
          {loading ? "" : `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="mrm-loading">
          <div className="mrm-spinner-wrap">
            <div className="mrm-spinner" />
            <div className="mrm-spinner mrm-spinner--2" />
          </div>
          <p>Fetching users…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="mrm-empty">
          <div className="mrm-empty-icon">◎</div>
          <p>No users match your search</p>
          <button className="mrm-empty-reset"
            onClick={() => { setSearch(""); setRoleFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`mrm-card-grid ${animated ? "is-animated" : ""}`}>
          {pageItems.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div
                key={user.objectId}
                className="mrm-card"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                {/* Avatar */}
                <div className="mrm-card-avatar-wrap">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="mrm-card-avatar" />
                  ) : (
                    <div className="mrm-card-avatar mrm-card-avatar--init"
                      style={{ background: avatarClr }}>
                      {getInitial(user.name)}
                    </div>
                  )}
                  <div className="mrm-card-avatar-ring" style={{ borderColor: avatarClr + "55" }} />
                </div>

                {/* Info */}
                <div className="mrm-card-info">
                  <p className="mrm-card-name">{user.name}</p>
                  <p className="mrm-card-username">@{user.username}</p>
                  <span
                    className="mrm-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}
                  >
                    {user.role === "manager" ? "⬡ Manager" : "◎ User"}
                  </span>
                </div>

                {/* UID */}
                <div className="mrm-card-uid">
                  <span className="mrm-uid-label">UID</span>
                  <span className="mrm-uid-val">{user.uid.slice(-10)}</span>
                </div>

                {/* Action */}
                <button
                  className={`mrm-action-btn ${user.role === "manager" ? "is-demote" : "is-promote"}`}
                  onClick={() => handleAction(user)}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <span className="mrm-btn-spin" />
                    : user.role === "manager"
                    ? "✕ Remove Manager"
                    : "✦ Make Manager"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`mrm-list-wrap ${animated ? "is-animated" : ""}`}>
          <div className="mrm-list-head">
            <span className="mrm-list-hcol" style={{ width: 48 }} />
            <span className="mrm-list-hcol mrm-list-hcol--grow">Name / Username</span>
            <span className="mrm-list-hcol mrm-list-hcol--hide-sm">UID</span>
            <span className="mrm-list-hcol">Role</span>
            <span className="mrm-list-hcol mrm-list-hcol--right">Action</span>
          </div>

          {pageItems.map((user, i) => {
            const roleStyle = getRoleStyle(user.role);
            const avatarClr = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div
                key={user.objectId}
                className="mrm-list-row"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Avatar */}
                <div className="mrm-list-avatar-wrap">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="mrm-list-avatar" />
                  ) : (
                    <div className="mrm-list-avatar mrm-list-avatar--init"
                      style={{ background: avatarClr }}>
                      {getInitial(user.name)}
                    </div>
                  )}
                </div>

                {/* Name + username */}
                <div className="mrm-list-cell mrm-list-cell--grow">
                  <span className="mrm-list-name">{user.name}</span>
                  <span className="mrm-list-uname">@{user.username}</span>
                </div>

                {/* UID */}
                <div className="mrm-list-cell mrm-list-cell--hide-sm">
                  <span className="mrm-list-uid">{user.uid}</span>
                </div>

                {/* Role badge */}
                <div className="mrm-list-cell">
                  <span
                    className="mrm-role-badge"
                    style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.text }}
                  >
                    {user.role === "manager" ? "⬡ Manager" : "◎ User"}
                  </span>
                </div>

                {/* Action */}
                <div className="mrm-list-cell mrm-list-cell--right">
                  <button
                    className={`mrm-action-btn mrm-action-btn--sm ${user.role === "manager" ? "is-demote" : "is-promote"}`}
                    onClick={() => handleAction(user)}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <span className="mrm-btn-spin" />
                      : user.role === "manager"
                      ? "Remove"
                      : "Make Manager"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mrm-pagination">
          <button className="mrm-page-btn mrm-page-nav"
            disabled={page === 0} onClick={() => changePage(0)} title="First">«</button>
          <button className="mrm-page-btn mrm-page-nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <>
              <button className="mrm-page-btn" onClick={() => changePage(0)}>1</button>
              {pageRange[0] > 1 && <span className="mrm-page-ellipsis">…</span>}
            </>
          )}

          {pageRange.map(i => (
            <button
              key={i}
              className={`mrm-page-btn mrm-page-num ${page === i ? "is-active" : ""}`}
              onClick={() => changePage(i)}
            >{i + 1}</button>
          ))}

          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>
              {pageRange[pageRange.length - 1] < totalPages - 2 && <span className="mrm-page-ellipsis">…</span>}
              <button className="mrm-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button>
            </>
          )}

          <button className="mrm-page-btn mrm-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="mrm-page-btn mrm-page-nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)} title="Last">»</button>

          <span className="mrm-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}