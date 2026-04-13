import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./MakeAppAdmin.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield, faUserShield, faRotateRight,
  faTableList, faBorderAll,
} from "@fortawesome/free-solid-svg-icons";

/* ════════════════════════════════════════════════════════════
   MakeAppAdmin.jsx — Corrected from PHP source
   
   PHP logic:
   1. Check user.admin_role === "admin" → is admin
   2. Make admin:
      - Set _User.admin_role = "admin"
      - Create AgentRole record: { admin_id, admin_by_id, total_points, points, total_agent, agents_list }
   3. Remove admin:
      - Set _User.admin_role = ""
      - Find AgentRole where admin_id = objectId, destroy it
════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 25;

/* ── helpers ── */
function getInitial(name) { return (name || "?").charAt(0).toUpperCase(); }
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str||"").length; i++) h = str.charCodeAt(i) + ((h<<5)-h);
  return p[Math.abs(h) % p.length];
}
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Copied!", "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      showToast("Copied!", "copy");
    });
}

export default function MakeAppAdmin() {

  const [users,         setUsers]         = useState([]);
  const [searchInput,   setSearchInput]   = useState("");
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("all");
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page,          setPage]          = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [viewMode,      setViewMode]      = useState("list");
  const [toast,         setToast]         = useState(null);
  const [animated,      setAnimated]      = useState(false);
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [fontSize,      setFontSize]      = useState("md");
  const [statCounts,    setStatCounts]    = useState({ total: 0, admin: 0 });

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

  /* ════════════════════════════════════════════════════════
     BUILD QUERY
     Uses admin_role field — same as PHP
  ════════════════════════════════════════════════════════ */
  const buildQuery = useCallback((roleF, srch) => {
    const User    = Parse.Object.extend("_User");
    const trimmed = srch.trim();

    if (trimmed) {
      const queries = [];
      const qN = new Parse.Query(User); qN.contains("name", trimmed);     queries.push(qN);
      const qU = new Parse.Query(User); qU.contains("username", trimmed); queries.push(qU);
      const n  = parseInt(trimmed);
      if (!isNaN(n)) { const qI = new Parse.Query(User); qI.equalTo("uid", n); queries.push(qI); }
      const combined = Parse.Query.or(...queries);
      if (roleF === "admin") combined.equalTo("admin_role", "admin");
      if (roleF === "user")  combined.notEqualTo("admin_role", "admin");
      return combined;
    }

    const q = new Parse.Query(User);
    if (roleF === "admin") q.equalTo("admin_role", "admin");
    if (roleF === "user")  q.notEqualTo("admin_role", "admin");
    return q;
  }, []);

  /* ════════════════════════════════════════════════════════
     FETCH STAT COUNTS
  ════════════════════════════════════════════════════════ */
  const fetchStatCounts = useCallback(async () => {
    try {
      const User   = Parse.Object.extend("_User");
      const mk     = { useMasterKey: true };
      const qTotal = new Parse.Query(User);
      const qAdmin = new Parse.Query(User); qAdmin.equalTo("admin_role", "admin");
      const [total, admin] = await Promise.all([
        qTotal.count(mk),
        qAdmin.count(mk),
      ]);
      setStatCounts({ total, admin });
    } catch (err) { console.error("Stat count:", err); }
  }, []);

  /* ════════════════════════════════════════════════════════
     FETCH PAGE
  ════════════════════════════════════════════════════════ */
  const fetchPage = useCallback(async (pageNum, roleF, srch) => {
    setLoading(true); setAnimated(false);
    try {
      const mk = { useMasterKey: true };
      const q      = buildQuery(roleF, srch);
      const countQ = buildQuery(roleF, srch);

      q.descending("createdAt");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select("uid","name","username","admin_role","avatar","gender");

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);
      setTotalCount(count);

      setUsers(batch.map(u => {
        const av = u.get("avatar");
        let avatarUrl = null;
        if (av && typeof av.url === "function") avatarUrl = av.url();
        else if (typeof av === "string") avatarUrl = av;
        return {
          objectId: u.id,
          uid:      String(u.get("uid") || u.id),
          name:     u.get("name")       || "—",
          username: u.get("username")   || "anonymous",
          gender:   u.get("gender")     || "—",
          isAdmin:  u.get("admin_role") === "admin", // matches PHP: $isAdmin = $user->get('admin_role') === "admin"
          avatar:   avatarUrl,
        };
      }));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [buildQuery, showToast]);

  useEffect(() => {
    fetchPage(page, roleFilter, search);
  }, [page, roleFilter, search, fetchPage]);

  useEffect(() => { fetchStatCounts(); }, [fetchStatCounts]);

  /* ── pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0,page-d); i <= Math.min(totalPages-1,page+d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  /* ════════════════════════════════════════════════════════
     TOGGLE ADMIN
     Matches PHP toggle_reseller logic exactly:
     
     MAKE ADMIN:
       1. _User.admin_role = "admin"
       2. Create AgentRole: { admin_id, admin_by_id:"admin",
                              total_points:0, points:0,
                              total_agent:0, agents_list:[] }
     
     REMOVE ADMIN:
       1. _User.admin_role = ""
       2. Find AgentRole where admin_id = objectId → destroy
  ════════════════════════════════════════════════════════ */
  const confirmToggle = async () => {
    if (!confirmModal) return;
    const user   = confirmModal;
    const making = !user.isAdmin; // true = making admin, false = removing
    setConfirmModal(null);
    setActionLoading(user.objectId);

    try {
      const mk  = { useMasterKey: true };
      const obj = await new Parse.Query(Parse.Object.extend("_User"))
        .get(user.objectId, mk);

      if (making) {
        /* ── MAKE ADMIN ── */
        obj.set("admin_role", "admin");
        await obj.save(null, mk);

        /* Create AgentRole record */
        const AgentRole = Parse.Object.extend("AgentRole");
        const agent     = new AgentRole();
        agent.set("admin_id",      user.objectId); // _User objectId
        agent.set("admin_by_id",   "admin");
        agent.set("total_points",  0);
        agent.set("points",        0);
        agent.set("total_agent",   0);
        agent.set("agents_list",   []);
        await agent.save(null, mk);

        showToast(`${user.username} is now an Admin ✓`, "success");

      } else {
        /* ── REMOVE ADMIN ── */
        obj.set("admin_role", "");
        await obj.save(null, mk);

        /* Find and destroy AgentRole record */
        const q = new Parse.Query("AgentRole");
        q.equalTo("admin_id", user.objectId);
        const existing = await q.first(mk);
        if (existing) await existing.destroy(mk);

        showToast(`${user.username} admin role removed`, "info");
      }

      /* Update local state */
      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, isAdmin: making } : u
      ));
      fetchStatCounts();

    } catch (err) {
      console.error("Toggle admin:", err);
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const refresh = () => { fetchPage(page, roleFilter, search); fetchStatCounts(); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className={`adm-root adm-fs--${fontSize}`}>

      {/* Toast */}
      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          <span className="adm-toast-dot"/>
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
                ? <><strong>@{confirmModal.username}</strong>'s admin role will be removed and their AgentRole record deleted.</>
                : <>Grant admin to <strong>@{confirmModal.username}</strong>? An AgentRole record will also be created.</>
              }
            </p>
            <div className="adm-modal-btns">
              <button className="adm-modal-cancel" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                className={`adm-modal-ok ${confirmModal.isAdmin ? "is-red" : "is-amber"}`}
                onClick={confirmToggle}>
                {confirmModal.isAdmin ? "Yes, Remove" : "Yes, Make Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="adm-header">
        <div>
          <p className="adm-label">Admin Management</p>
          <h1 className="adm-title">App Admins</h1>
          <p className="adm-sub">
            {`${statCounts.total.toLocaleString()} users · ${statCounts.admin} admins · showing ${users.length} of ${totalCount}`}
          </p>
        </div>
        <div className="adm-header-actions">
          {/* Font size */}
          <div className="adm-toggle adm-fs-toggle">
            {[{key:"sm",label:"S"},{key:"md",label:"M"},{key:"lg",label:"L"}].map(f => (
              <button key={f.key}
                className={`adm-toggle-btn adm-fs-btn ${fontSize===f.key?"on":""}`}
                onClick={() => setFontSize(f.key)}>{f.label}</button>
            ))}
          </div>
          {/* View toggle */}
          <div className="adm-toggle">
            <button className={`adm-toggle-btn ${viewMode==="list"?"on":""}`}
              onClick={() => setViewMode("list")} title="List">
              <FontAwesomeIcon icon={faTableList}/>
            </button>
            <button className={`adm-toggle-btn ${viewMode==="card"?"on":""}`}
              onClick={() => setViewMode("card")} title="Cards">
              <FontAwesomeIcon icon={faBorderAll}/>
            </button>
          </div>
          <button className="adm-refresh" onClick={refresh} disabled={loading} title="Refresh">
            {loading ? <span className="adm-spin"/> : <FontAwesomeIcon icon={faRotateRight}/>}
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div className="adm-pills">
        {[
          { key:"all",   label:"All Users", val:statCounts.total,                    dot:"#818cf8" },
          { key:"admin", label:"Admins",    val:statCounts.admin,                    dot:"#f5a623" },
          { key:"user",  label:"Regular",   val:statCounts.total - statCounts.admin, dot:"#60a5fa" },
        ].map((s,i) => (
          <button key={s.key}
            className={`adm-pill ${roleFilter===s.key?"adm-pill--on":""}`}
            style={{ animationDelay:`${i*60}ms` }}
            onClick={() => { setRoleFilter(s.key); setPage(0); }}>
            <span className="adm-pill-dot" style={{ background:s.dot }}/>
            <span className="adm-pill-val">{s.val.toLocaleString()}</span>
            <span className="adm-pill-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="adm-search-row">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">⌕</span>
          <input className="adm-search"
            placeholder="Search name, username or UID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}/>
          {searchInput && (
            <button className="adm-search-x"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="adm-count">{totalCount} result{totalCount!==1?"s":""}</span>
        )}
      </div>

      {/* Page indicator */}
      {!loading && totalPages > 1 && (
        <div className="adm-page-indicator">
          <span>Page <strong>{page+1}</strong> of <strong>{totalPages}</strong></span>
          <span className="adm-page-indicator-dot"/>
          <span>Records <strong>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,totalCount)}</strong> of <strong>{totalCount}</strong></span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="adm-loading">
          <div className="adm-loading-ring"/>
          <p>Fetching users…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">★</span>
          <p>No users found</p>
          <button className="adm-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* CARD VIEW */
        <div className={`adm-cards ${animated?"in":""}`}>
          {users.map((user, i) => {
            const clr = getAvatarColor(user.username);
            const il  = actionLoading === user.objectId;
            return (
              <div key={user.objectId}
                className={`adm-card ${user.isAdmin?"adm-card--admin":""}`}
                style={{ animationDelay:`${i*40}ms` }}>

                {user.isAdmin && <span className="adm-admin-tag">★ Admin</span>}

                <div className="adm-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="adm-card-av"/>
                    : <div className="adm-card-av adm-card-av--init" style={{ background:clr }}>{getInitial(user.name)}</div>
                  }
                  {user.isAdmin && <div className="adm-card-star">★</div>}
                </div>

                <p className="adm-card-name">{user.name}</p>
                <p className="adm-card-user copyable"
                  onClick={() => copyToClipboard(user.username, showToast)}>@{user.username}</p>

                <div className="adm-uid copyable"
                  onClick={() => copyToClipboard(user.uid, showToast)}>
                  <span className="adm-uid-tag">UID</span>
                  <span className="adm-uid-val">{user.uid}</span>
                </div>

                <button
                  className={`adm-btn ${user.isAdmin?"adm-btn--remove":"adm-btn--make"}`}
                  disabled={il}
                  onClick={() => setConfirmModal(user)}>
                  {il ? <span className="adm-spin"/> : (
                    <><FontAwesomeIcon icon={user.isAdmin?faUserShield:faShield}/>
                    {user.isAdmin?" Remove Admin":" Make Admin"}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

      ) : (

        /* LIST VIEW */
        <div className={`adm-list ${animated?"in":""}`}>
          <div className="adm-list-head">
            <span className="adm-lh" style={{ width:52, flexShrink:0 }}/>
            <span className="adm-lh adm-lh--grow">Name / Username</span>
            <span className="adm-lh adm-lh--uid">UID</span>
            <span className="adm-lh adm-lh--uid">Gender</span>
            <span className="adm-lh">Role</span>
            <span className="adm-lh adm-lh--right">Action</span>
          </div>

          {users.map((user, i) => {
            const clr = getAvatarColor(user.username);
            const il  = actionLoading === user.objectId;
            return (
              <div key={user.objectId}
                className={`adm-row ${user.isAdmin?"adm-row--admin":""}`}
                style={{ animationDelay:`${i*25}ms` }}>

                {/* Avatar */}
                <div className="adm-row-av">
                  {user.avatar
                    ? <img src={user.avatar} alt="" className="adm-av-img"/>
                    : <div className="adm-av-img adm-av-init" style={{ background:clr }}>{getInitial(user.name)}</div>
                  }
                  {user.isAdmin && <span className="adm-av-star">★</span>}
                </div>

                {/* Name */}
                <div className="adm-cell adm-cell--grow">
                  <span className="adm-row-name">{user.name}</span>
                  <span className="adm-row-user copyable"
                    onClick={() => copyToClipboard(user.username, showToast)}>@{user.username}</span>
                </div>

                {/* UID */}
                <div className="adm-cell adm-cell--uid">
                  <span className="adm-row-uid adm-row-uid--chip copyable"
                    onClick={() => copyToClipboard(user.uid, showToast)}>{user.uid}</span>
                </div>

                {/* Gender */}
                <div className="adm-cell adm-cell--uid">
                  <span className="adm-row-uid">{user.gender}</span>
                </div>

                {/* Role badge */}
                <div className="adm-cell">
                  <span className={`adm-badge ${user.isAdmin?"adm-badge--admin":"adm-badge--user"}`}>
                    {user.isAdmin
                      ? <><FontAwesomeIcon icon={faShield}/> Admin</>
                      : "User"
                    }
                  </span>
                </div>

                {/* Action */}
                <div className="adm-cell adm-cell--right">
                  <button
                    className={`adm-btn adm-btn--sm ${user.isAdmin?"adm-btn--remove":"adm-btn--make"}`}
                    disabled={il}
                    onClick={() => setConfirmModal(user)}>
                    {il ? <span className="adm-spin"/> : (
                      <><FontAwesomeIcon icon={user.isAdmin?faUserShield:faShield}/>
                      {user.isAdmin?" Remove":" Make Admin"}</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="adm-pages">
          <button className="adm-page adm-page--nav" disabled={page===0||loading} onClick={() => changePage(0)}>«</button>
          <button className="adm-page adm-page--nav" disabled={page===0||loading} onClick={() => changePage(page-1)}>‹</button>
          {pageRange[0]>0&&(<><button className="adm-page" onClick={()=>changePage(0)}>1</button>{pageRange[0]>1&&<span className="adm-dots">…</span>}</>)}
          {pageRange.map(i=>(<button key={i} className={`adm-page ${page===i?"adm-page--on":""}`} onClick={()=>changePage(i)}>{i+1}</button>))}
          {pageRange[pageRange.length-1]<totalPages-1&&(<>{pageRange[pageRange.length-1]<totalPages-2&&<span className="adm-dots">…</span>}<button className="adm-page" onClick={()=>changePage(totalPages-1)}>{totalPages}</button></>)}
          <button className="adm-page adm-page--nav" disabled={page===totalPages-1||loading} onClick={() => changePage(page+1)}>›</button>
          <button className="adm-page adm-page--nav" disabled={page===totalPages-1||loading} onClick={() => changePage(totalPages-1)}>»</button>
        </div>
      )}

    </div>
  );
}