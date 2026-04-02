import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeAppAdmin.css";

const PAGE_SIZE = 10;

/* ── helpers ── */
function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast(`Copied!`, "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast(`Copied!`, "copy");
    });
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function MakeAppAdmin() {
  const [users,         setUsers]         = useState([]);
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("all");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [fontSize,      setFontSize]      = useState("md"); // "sm" | "md" | "lg"

  /* toast */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* fetch */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      let all = [], skip = 0;
      while (true) {
        const q = new Parse.Query(User);
        q.limit(1000);
        q.skip(skip);
        q.descending("createdAt");
        q.select("uid", "name", "username", "isAdmin", "avatar");
        const batch = await q.find({ useMasterKey: true });
        if (!batch.length) break;
        all = [...all, ...batch.map(u => {
          const av = u.get("avatar");
          let avatarUrl = null;
          if (av && typeof av.url === "function") avatarUrl = av.url();
          else if (typeof av === "string") avatarUrl = av;
          return {
            objectId: u.id,
            uid:      String(u.get("uid") || u.id),
            name:     u.get("name")     || "—",
            username: u.get("username") || "anonymous",
            isAdmin:  !!u.get("isAdmin"),
            avatar:   avatarUrl,
          };
        })];
        if (batch.length < 1000) break;
        skip += 1000;
      }
      setUsers(all);
      setPage(0);
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* filter */
  const displayed = useMemo(() => {
    let list = [...users];
    if (roleFilter === "admin") list = list.filter(u => u.isAdmin);
    if (roleFilter === "user")  list = list.filter(u => !u.isAdmin);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.uid.toLowerCase().includes(q)      ||
        u.name.toLowerCase().includes(q)     ||
        u.username.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, search, roleFilter]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const adminCount = users.filter(u => u.isAdmin).length;

  /* toggle admin */
  const confirmToggle = async () => {
    if (!confirmModal) return;
    const user   = confirmModal;
    const newVal = !user.isAdmin;
    setConfirmModal(null);
    setActionLoading(user.objectId);
    try {
      const User = Parse.Object.extend("_User");
      const obj  = await new Parse.Query(User).get(user.objectId, { useMasterKey: true });
      obj.set("isAdmin", newVal);
      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, isAdmin: newVal } : u
      ));
      showToast(
        newVal ? `${user.username} is now an Admin` : `${user.username} admin removed`,
        newVal ? "success" : "info"
      );
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  /* pagination range */
  const pageRange = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);

  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className={`adm-root adm-fs--${fontSize}`}>

      {/* Toast */}
      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          <span className="adm-toast-dot" />
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="adm-overlay" onClick={() => setConfirmModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-av" style={{ background: getAvatarColor(confirmModal.username) }}>
              {getInitial(confirmModal.name)}
            </div>
            <h3 className="adm-modal-title">
              {confirmModal.isAdmin ? "Remove Admin" : "Make Admin"}
            </h3>
            <p className="adm-modal-desc">
              {confirmModal.isAdmin
                ? <>Remove admin from <strong>@{confirmModal.username}</strong>?</>
                : <>Grant admin to <strong>@{confirmModal.username}</strong>?</>
              }
            </p>
            <div className="adm-modal-btns">
              <button className="adm-modal-cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                className={`adm-modal-ok ${confirmModal.isAdmin ? "is-red" : "is-amber"}`}
                onClick={confirmToggle}
              >
                {confirmModal.isAdmin ? "Remove" : "Make Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="adm-header">
        <div>
          <p className="adm-label">Admin Management</p>
          <h1 className="adm-title">App Admins</h1>
          <p className="adm-sub">
            {loading ? "Loading…" : `${users.length.toLocaleString()} users · ${adminCount} admins`}
          </p>
        </div>
        <div className="adm-header-actions">
          {/* Font size */}
          <div className="adm-toggle adm-fs-toggle">
            {[
              { key: "sm", label: "S" },
              { key: "md", label: "M" },
              { key: "lg", label: "L" },
            ].map(f => (
              <button
                key={f.key}
                className={`adm-toggle-btn adm-fs-btn ${fontSize === f.key ? "on" : ""}`}
                onClick={() => setFontSize(f.key)}
                title={`${f.key === "sm" ? "Small" : f.key === "md" ? "Medium" : "Large"} font`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="adm-toggle">
            <button className={`adm-toggle-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")}>≡</button>
            <button className={`adm-toggle-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")}>⊞</button>
          </div>
          <button className="adm-refresh" onClick={fetchUsers} disabled={loading}>
            {loading ? <span className="adm-spin" /> : "↻"}
          </button>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="adm-pills">
        {[
          { key: "all",   label: "All",     val: users.length,              dot: "#818cf8" },
          { key: "admin", label: "Admins",  val: adminCount,                dot: "#fbbf24" },
          { key: "user",  label: "Regular", val: users.length - adminCount, dot: "#60a5fa" },
        ].map((s, i) => (
          <button
            key={s.key}
            className={`adm-pill ${roleFilter === s.key ? "adm-pill--on" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => { setRoleFilter(s.key); setPage(0); }}
          >
            <span className="adm-pill-dot" style={{ background: s.dot }} />
            <span className="adm-pill-val">{loading ? "…" : s.val}</span>
            <span className="adm-pill-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="adm-search-row">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">⌕</span>
          <input
            className="adm-search"
            placeholder="Search name, username or UID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="adm-search-x" onClick={() => { setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="adm-count">{displayed.length} result{displayed.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="adm-loading">
          <div className="adm-loading-ring" />
          <p>Fetching users…</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">★</span>
          <p>No users found</p>
          <button className="adm-empty-reset"
            onClick={() => { setSearch(""); setRoleFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ── CARD VIEW ── */
        <div className={`adm-cards ${animated ? "in" : ""}`}>
          {pageItems.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className={`adm-card ${user.isAdmin ? "adm-card--admin" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}>

                {user.isAdmin && <span className="adm-admin-tag">★ Admin</span>}

                <div className="adm-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="adm-card-av" />
                    : <div className="adm-card-av adm-card-av--init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  {user.isAdmin && <div className="adm-card-star">★</div>}
                </div>

                <p className="adm-card-name">{user.name}</p>
                <p
                  className="adm-card-user copyable"
                  onClick={() => copyToClipboard(user.username, showToast)}
                  title="Copy username"
                >@{user.username}</p>

                <div
                  className="adm-uid copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)}
                  title="Copy UID"
                >
                  <span className="adm-uid-tag">UID</span>
                  <span className="adm-uid-val">{user.uid}</span>
                </div>

                <button
                  className={`adm-btn ${user.isAdmin ? "adm-btn--remove" : "adm-btn--make"}`}
                  disabled={isLoading}
                  onClick={() => setConfirmModal(user)}
                >
                  {isLoading
                    ? <span className="adm-spin" />
                    : user.isAdmin ? "Remove Admin" : "Make Admin"}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <div className={`adm-list ${animated ? "in" : ""}`}>
          <div className="adm-list-head">
            <span style={{ width: 44, flexShrink: 0 }} />
            <span className="adm-lh adm-lh--grow">Name</span>
            <span className="adm-lh adm-lh--sm">UID</span>
            <span className="adm-lh">Role</span>
            <span className="adm-lh adm-lh--right">Action</span>
          </div>

          {pageItems.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const isLoading = actionLoading === user.objectId;
            return (
              <div key={user.objectId} className="adm-row"
                style={{ animationDelay: `${i * 25}ms` }}>

                {/* Avatar */}
                <div className="adm-row-av">
                  {user.avatar
                    ? <img src={user.avatar} alt="" className="adm-av-img" />
                    : <div className="adm-av-img adm-av-init" style={{ background: clr }}>
                        {getInitial(user.name)}
                      </div>
                  }
                  {user.isAdmin && <span className="adm-av-star">★</span>}
                </div>

                {/* Name + username */}
                <div className="adm-cell adm-cell--grow">
                  <span className="adm-row-name">{user.name}</span>
                  <span
                    className="adm-row-user copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}
                    title="Copy"
                  >@{user.username}</span>
                </div>

                {/* UID */}
                <div className="adm-cell adm-cell--sm">
                  <span
                    className="adm-row-uid copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}
                    title="Copy UID"
                  >{user.uid}</span>
                </div>

                {/* Role badge */}
                <div className="adm-cell">
                  <span className={`adm-badge ${user.isAdmin ? "adm-badge--admin" : "adm-badge--user"}`}>
                    {user.isAdmin ? "★ Admin" : "User"}
                  </span>
                </div>

                {/* Action */}
                <div className="adm-cell adm-cell--right">
                  <button
                    className={`adm-btn adm-btn--sm ${user.isAdmin ? "adm-btn--remove" : "adm-btn--make"}`}
                    disabled={isLoading}
                    onClick={() => setConfirmModal(user)}
                  >
                    {isLoading
                      ? <span className="adm-spin" />
                      : user.isAdmin ? "Remove" : "Make Admin"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="adm-pages">
          <button className="adm-page adm-page--nav"
            disabled={page === 0} onClick={() => changePage(0)}>«</button>
          <button className="adm-page adm-page--nav"
            disabled={page === 0} onClick={() => changePage(page - 1)}>‹</button>

          {pageRange[0] > 0 && (
            <><button className="adm-page" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="adm-dots">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`adm-page ${page === i ? "adm-page--on" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 && <span className="adm-dots">…</span>}
            <button className="adm-page" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="adm-page adm-page--nav"
            disabled={page === totalPages - 1} onClick={() => changePage(page + 1)}>›</button>
          <button className="adm-page adm-page--nav"
            disabled={page === totalPages - 1} onClick={() => changePage(totalPages - 1)}>»</button>
        </div>
      )}

    </div>
  );
}