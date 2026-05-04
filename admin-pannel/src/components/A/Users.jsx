import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AllUsers.css";

/* ═══════════════════════════════════════════════════════════
   AllUsers.jsx — User Management with Device Ban support
   PHP actions mapped:
     toggle_reseller  → toggleUserBan()   → _User.is_banned (bool)
     toggle_device_ban→ toggleDeviceBan() → BannedDevices class
       • device_id  = _User.device_id
       • auther_id  = _User objectId
       • status     = bool (true=banned)
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 25;

/* ── helpers ── */
function getInitial(name) { return (name || "?").charAt(0).toUpperCase(); }
function getAvatarColor(str) {
  const palette = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let hash = 0;
  for (let i = 0; i < (str||"").length; i++) hash = str.charCodeAt(i) + ((hash<<5)-hash);
  return palette[Math.abs(hash) % palette.length];
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000);
  if (m<1)  return "just now";
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h ago`;
  const day = Math.floor(h/24);
  if (day<30) return `${day}d ago`;
  return new Date(d).toLocaleDateString("en-GB");
}
function copyText(text, showToast) {
  navigator.clipboard?.writeText(text)
    .then(() => showToast(`Copied: ${text}`, "copy"))
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      showToast(`Copied: ${text}`, "copy");
    });
}

/* ── server-side query builder ── */
function buildQuery(User, statusFilter, srch) {
  const trim = srch.trim();
  if (trim) {
    const queries = [];
    const qN = new Parse.Query(User); qN.contains("name",     trim); queries.push(qN);
    const qU = new Parse.Query(User); qU.contains("username", trim); queries.push(qU);
    const n = parseInt(trim);
    if (!isNaN(n)) { const qI = new Parse.Query(User); qI.equalTo("uid", n); queries.push(qI); }
    const combined = Parse.Query.or(...queries);
    if (statusFilter === "suspended") combined.equalTo("status", "suspended");
    if (statusFilter === "active")    combined.notEqualTo("status", "suspended");
    if (statusFilter === "banned")    combined.equalTo("is_banned", true);
    if (statusFilter === "device_banned") {/* handled separately */}
    return combined;
  }
  const q = new Parse.Query(User);
  if (statusFilter === "suspended") q.equalTo("status", "suspended");
  if (statusFilter === "active")    q.notEqualTo("status", "suspended");
  if (statusFilter === "banned")    q.equalTo("is_banned", true);
  return q;
}

/* ── map Parse user object → plain JS ── */
function mapUser(u) {
  const av = u.get("avatar");
  let avatarUrl = null;
  if (av && typeof av.url === "function") avatarUrl = av.url();
  else if (typeof av === "string") avatarUrl = av;
  return {
    objectId:  u.id,
    uid:       String(u.get("uid") || u.id),
    name:      u.get("name")       || "—",
    username:  u.get("username")   || "anonymous",
    // coin:      u.get("coin")       || 0,
    gender:    u.get("gender")     || "—",
    status:    u.get("status")     || "active",
    mode:      u.get("mode")       || "—",
    email:     u.get("email")      || "—",
    birthday:  u.get("birthday")   || null,
    device_id: u.get("device_id")  || null,   /* for device ban */
    is_banned: !!u.get("is_banned"),           /* user block toggle */
    avatar:    avatarUrl,
    createdAt: u.get("createdAt"),
    //Modified
    country: u.get("country") || "",
    credit: u.get("credit") || 0,
    earning: u.get("diamonds") || 0,
    creditSent: u.get("creditSent") || 0,
    // fraud: u.get("fraud") || false,
    bio: u.get("bio") || "",
    first_name: u.get("first_name") || "",
    last_name: u.get("last_name") || "",
    avatar: avatarUrl,
  };
}

/* ════════════════════════════════════════════════════════════
   CONFIRM MODAL (generic)
════════════════════════════════════════════════════════════ */
function ConfirmModal({ data, onClose, onConfirm, loading }) {
  if (!data) return null;
  const { title, body, confirmLabel, danger } = data;
  return (
    <div className="au-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="au-modal">
        <div className="au-modal-icon" style={{ background: danger ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)" }}>
          <span style={{ fontSize:22, color: danger ? "#f87171" : "#34d399" }}>
            {danger ? "⚠" : "✓"}
          </span>
        </div>
        <h3 className="au-modal-title">{title}</h3>
        <p className="au-modal-body" dangerouslySetInnerHTML={{ __html: body }} />
        <div className="au-modal-actions">
          <button className="au-modal-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`au-modal-confirm ${danger ? "is-red" : "is-green"}`}
            onClick={onConfirm} disabled={loading}>
            {loading ? <span className="au-btn-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function AllUsers() {

  /* data */
  const [users,          setUsers]          = useState([]);
  const [searchInput,    setSearchInput]    = useState("");
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [sortBy,         setSortBy]         = useState("newest");
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState(null);
  const [page,           setPage]           = useState(0);
  const [totalCount,     setTotalCount]     = useState(0);
  const [viewMode,       setViewMode]       = useState("list");
  const [toast,          setToast]          = useState(null);
  const [animated,       setAnimated]       = useState(false);

  /* stat counts */
  const [statCounts, setStatCounts] = useState({ total:0, active:0, suspended:0, banned:0 });

  /* device ban cache: { [objectId]: { hasBan: bool, status: bool, banObjId: string } } */
  const [deviceBanMap, setDeviceBanMap] = useState({});

  /* modals */
  const [viewUser,     setViewUser]     = useState(null);
  const [editUser,     setEditUser]     = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); /* generic confirm */
  

  /* ── toast ── */
  const showToast = useCallback((msg, type="success") => {
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
      const [total, suspended, banned] = await Promise.all([
        new Parse.Query(User).count(mk),
        (() => { const q = new Parse.Query(User); q.equalTo("status","suspended"); return q.count(mk); })(),
        (() => { const q = new Parse.Query(User); q.equalTo("is_banned",true);    return q.count(mk); })(),
      ]);
      setStatCounts({ total, suspended, banned, active: total - suspended });
    } catch(e) { console.error(e); }
  }, []);

  /* ── fetch page (server-side paginated) ── */
  const fetchPage = useCallback(async (pg, statusF, srch, sort) => {
    setLoading(true); setAnimated(false);
    try {
      const User = Parse.Object.extend("_User");
      const mk   = { useMasterKey: true };
      const q      = buildQuery(User, statusF, srch);
      const countQ = buildQuery(User, statusF, srch);

      if (sort==="oldest") q.ascending("createdAt");
      else if (sort==="name")  q.ascending("name");
      // else if (sort==="coins") q.descending("coin");
      else q.descending("createdAt");

      q.limit(PAGE_SIZE); q.skip(pg * PAGE_SIZE);
      //Modified
      q.select(
              "uid","name","username","coin","gender","status","mode","email",
              "birthday","avatar","createdAt","device_id","is_banned",

                    // NEW FIELDS
              "country","credit","earning","creditSent","bio",
              "first_name","last_name","user_state_in_app","lastOnline"
              );

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);
      setTotalCount(count);
      const mapped = batch.map(mapUser);
      setUsers(mapped);

      /* load device ban status for all users on this page */
      const deviceIds = mapped.map(u=>u.device_id).filter(Boolean);
      if (deviceIds.length > 0) {
        const bq = new Parse.Query("BannedDevices");
        bq.containedIn("device_id", deviceIds);
        bq.limit(deviceIds.length * 2);
        const bans = await bq.find(mk);
        const map = {};
        bans.forEach(b => {
          const did = b.get("device_id");
          map[did] = { hasBan: true, status: !!b.get("status"), banObjId: b.id };
        });
        /* rebuild by objectId */
        const byUserId = {};
        mapped.forEach(u => {
          if (u.device_id) {
            byUserId[u.objectId] = map[u.device_id] || { hasBan: false, status: false, banObjId: null };
          }
        });
        setDeviceBanMap(byUserId);
      }
    } catch(e) {
      showToast("Fetch failed: "+e.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => { fetchPage(page, statusFilter, search, sortBy); }, [page, statusFilter, search, sortBy, fetchPage]);
  useEffect(() => { fetchStatCounts(); }, [fetchStatCounts]);

  /* ════════════════════════════════════════════════════════
     ACTION: Toggle user block (is_banned on _User)
     Maps to PHP: toggle_reseller / is_banned
  ════════════════════════════════════════════════════════ */
  const toggleUserBan = useCallback(async (user) => {
    const newBanned = !user.is_banned;
    setConfirmModal(null);
    setActionLoading(`ban_${user.objectId}`);
    try {
      const q   = new Parse.Query("_User");
      const obj = await q.get(user.objectId, { useMasterKey: true });
      obj.set("is_banned", newBanned);
      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, is_banned: newBanned } : u
      ));
      fetchStatCounts();
      showToast(`${user.username} ${newBanned ? "blocked" : "unblocked"}`,
        newBanned ? "info" : "success");
    } catch(e) { showToast("Failed: "+e.message, "error"); }
    finally    { setActionLoading(null); }
  }, [showToast, fetchStatCounts]);

  /* ════════════════════════════════════════════════════════
     ACTION: Toggle device ban (BannedDevices class)
     Maps to PHP: toggle_device_ban
     • If BannedDevices record exists → toggle status
     • If not → create new record with status:true
  ════════════════════════════════════════════════════════ */
  const toggleDeviceBan = useCallback(async (user) => {
    if (!user.device_id) { showToast("No device ID on this user", "error"); return; }
    setConfirmModal(null);
    setActionLoading(`dev_${user.objectId}`);
    try {
      const mk = { useMasterKey: true };
      const bq = new Parse.Query("BannedDevices");
      bq.equalTo("device_id", user.device_id);
      const existing = await bq.first(mk);

      let newStatus;
      if (existing) {
        /* toggle existing record */
        newStatus = !existing.get("status");
        existing.set("status", newStatus);
        await existing.save(null, mk);
        setDeviceBanMap(prev => ({
          ...prev,
          [user.objectId]: { hasBan: true, status: newStatus, banObjId: existing.id },
        }));
      } else {
        /* create new record — device not in BannedDevices yet */
        const BanClass = Parse.Object.extend("BannedDevices");
        const newBan   = new BanClass();
        newBan.set("device_id", user.device_id);
        newBan.set("auther_id", user.objectId);
        newBan.set("status",    true);
        await newBan.save(null, mk);
        newStatus = true;
        setDeviceBanMap(prev => ({
          ...prev,
          [user.objectId]: { hasBan: true, status: true, banObjId: newBan.id },
        }));
      }
      showToast(
        `Device ${newStatus ? "banned" : "unbanned"} for ${user.username}`,
        newStatus ? "info" : "success"
      );
    } catch(e) { showToast("Device ban failed: "+e.message, "error"); }
    finally    { setActionLoading(null); }
  }, [showToast]);

  /* ── suspend toggle (status field) ── */
  const toggleSuspend = useCallback(async (user) => {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    setConfirmModal(null);
    setActionLoading(`sus_${user.objectId}`);
    try {
      const q   = new Parse.Query("_User");
      const obj = await q.get(user.objectId, { useMasterKey: true });
      obj.set("status", newStatus);
      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.map(u =>
        u.objectId === user.objectId ? { ...u, status: newStatus } : u
      ));
      fetchStatCounts();
      showToast(`${user.username} ${newStatus==="suspended"?"suspended":"activated"}`,
        newStatus==="suspended"?"info":"success");
    } catch(e) { showToast("Failed: "+e.message, "error"); }
    finally    { setActionLoading(null); }
  }, [showToast, fetchStatCounts]);

  /* ── edit save ── */
  const saveEdit = useCallback(async () => {
    if (!editUser) return;
    setActionLoading(`edit_${editUser.objectId}`);
    try {
      const q   = new Parse.Query("_User");
      const obj = await q.get(editUser.objectId, { useMasterKey: true });


      obj.set("username", editUser.username);
      obj.set("name", editUser.name);
      obj.set("first_name", editUser.first_name);
      obj.set("last_name", editUser.last_name);

      obj.set("country", editUser.country);

      obj.set("coin", Number(editUser.coin) || 0);
      obj.set("credit", Number(editUser.credit) || 0);
      obj.set("diamonds", Number(editUser.earning) || 0);
      obj.set("creditSent", Number(editUser.creditSent) || 0);

      obj.set("gender", editUser.gender);
      // obj.set("mode", editUser.mode);
      obj.set("bio", editUser.bio);

      // obj.set("fraud", !!editUser.fraud);

      // avatar (only if file object)
      if (editUser.avatar === null) {
        obj.unset("avatar"); //  THIS REMOVES IT FROM PARSE
      } 
      else if (editUser.avatar instanceof Parse.File) {
        obj.set("avatar", editUser.avatar);
      }


      await obj.save(null, { useMasterKey: true });
      setUsers(prev => prev.map(u =>
        u.objectId === editUser.objectId ? { ...u, ...editUser, coin: Number(editUser.coin)||0 } : u
      ));
      setEditUser(null);
      showToast(`${editUser.username} updated`, "success");
    } catch(e) { showToast("Update failed: "+e.message, "error"); }
    finally    { setActionLoading(null); }
  }, [editUser, showToast]);

  /* ── pagination ── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const delta = 2, range = [];
    for (let i=Math.max(0,page-delta); i<=Math.min(totalPages-1,page+delta); i++) range.push(i);
    return range;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({top:0,behavior:"smooth"}); };

  /* ── helper: open confirm modal ── */
  const askConfirm = (data) => setConfirmModal(data);

  const refresh = () => { fetchPage(page, statusFilter, search, sortBy); fetchStatCounts(); };

  /* ════════════════════════════════════════════════════════
     ACTION ROW — buttons for both table and card
  ════════════════════════════════════════════════════════ */
  function ActionButtons({ user, compact }) {
    const devBan     = deviceBanMap[user.objectId] || { hasBan:false, status:false };
    const isDevBanned = devBan.status;
    const isUserBanned= user.is_banned;
    const isSuspended = user.status === "suspended";
    const isAnyLoading= actionLoading === `ban_${user.objectId}` ||
                        actionLoading === `dev_${user.objectId}` ||
                        actionLoading === `sus_${user.objectId}` ||
                        actionLoading === `edit_${user.objectId}`;

    if (compact) {
      /* icon-only buttons for list view */
      return (
        <div className="au-list-actions-cell">
          {/* View */}
          <button className="au-icon-btn au-icon-btn--view" title="View profile"
            onClick={() => setViewUser(user)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          {/* Edit */}
          <button className="au-icon-btn au-icon-btn--edit" title="Edit user"
            onClick={() => setEditUser({
                      ...user,
                      country: user.country || "",
                      credit: user.credit || 0,
                      earning: user.earning || 0,
                      creditSent: user.creditSent || 0,
                      // fraud: user.fraud || false,
                      bio: user.bio || "",
                      first_name: user.first_name || "",
                      last_name: user.last_name || "",
                    })}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          {/* Suspend */}
          <button
            className={`au-icon-btn ${isSuspended?"au-icon-btn--activate":"au-icon-btn--suspend"}`}
            title={isSuspended?"Activate":"Suspend"}
            disabled={isAnyLoading}
            onClick={() => askConfirm({
              title: isSuspended ? "Activate Account" : "Suspend Account",
              body: `${isSuspended?"Activate":"Suspend"} <strong>@${user.username}</strong>?`,
              confirmLabel: isSuspended ? "Yes, Activate" : "Yes, Suspend",
              danger: !isSuspended,
              action: () => toggleSuspend(user),
            })}>
            {actionLoading===`sus_${user.objectId}` ? <span className="au-btn-spin"/> :
              isSuspended
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            }
          </button>
          {/* Block user (is_banned) */}
          <button
            className={`au-icon-btn ${isUserBanned?"au-icon-btn--unblock":"au-icon-btn--block"}`}
            title={isUserBanned?"Unblock User":"Block User"}
            disabled={isAnyLoading}
            onClick={() => askConfirm({
              title: isUserBanned ? "Unblock User" : "Block User",
              body: `${isUserBanned?"Unblock":"Block"} <strong>@${user.username}</strong>?${!isUserBanned?" They won't be able to log in.":""}`,
              confirmLabel: isUserBanned ? "Unblock" : "Block",
              danger: !isUserBanned,
              action: () => toggleUserBan(user),
            })}>
            {actionLoading===`ban_${user.objectId}` ? <span className="au-btn-spin"/> :
              isUserBanned
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            }
          </button>
          {/* Device ban */}
          {user.device_id && (
            <button
              className={`au-icon-btn ${isDevBanned?"au-icon-btn--dev-active":"au-icon-btn--dev"}`}
              title={isDevBanned?"Unban Device":"Ban Device"}
              disabled={isAnyLoading}
              onClick={() => askConfirm({
                title: isDevBanned ? "Unban Device" : "Ban Device",
                body: `${isDevBanned?"Unban":"Ban"} device <code style="font-size:11px;background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px">${user.device_id.slice(0,12)}…</code> for <strong>@${user.username}</strong>?`,
                confirmLabel: isDevBanned ? "Unban Device" : "Ban Device",
                danger: !isDevBanned,
                action: () => toggleDeviceBan(user),
              })}>
              {actionLoading===`dev_${user.objectId}` ? <span className="au-btn-spin"/> :
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/>{isDevBanned?<line x1="4" y1="4" x2="20" y2="20"/>:<circle cx="12" cy="16" r="1"/>}</svg>
              }
            </button>
          )}
        </div>
      );
    }

    /* full-label buttons for card view */
    return (
      <div className="au-card-actions">
        <button className="au-act-btn au-act-btn--view" onClick={() => setViewUser(user)}>
          👁 View
        </button>
        <button className="au-act-btn au-act-btn--edit" onClick={() => setEditUser(user)}>
          ✎ Edit
        </button>
        <button
          className={`au-act-btn ${isSuspended?"au-act-btn--activate":"au-act-btn--suspend"}`}
          disabled={isAnyLoading}
          onClick={() => askConfirm({
            title: isSuspended ? "Activate" : "Suspend",
            body: `${isSuspended?"Activate":"Suspend"} <strong>@${user.username}</strong>?`,
            confirmLabel: isSuspended ? "Activate" : "Suspend",
            danger: !isSuspended,
            action: () => toggleSuspend(user),
          })}>
          {actionLoading===`sus_${user.objectId}` ? <span className="au-btn-spin"/> : isSuspended ? "✓ Activate" : "⊘ Suspend"}
        </button>
        <button
          className={`au-act-btn ${isUserBanned?"au-act-btn--unblock":"au-act-btn--block"}`}
          disabled={isAnyLoading}
          onClick={() => askConfirm({
            title: isUserBanned ? "Unblock User" : "Block User",
            body: `${isUserBanned?"Unblock":"Block"} <strong>@${user.username}</strong>?`,
            confirmLabel: isUserBanned ? "Unblock" : "Block",
            danger: !isUserBanned,
            action: () => toggleUserBan(user),
          })}>
          {actionLoading===`ban_${user.objectId}` ? <span className="au-btn-spin"/> : isUserBanned ? "🔓 Unblock" : "🔒 Block"}
        </button>
        {user.device_id && (
          <button
            className={`au-act-btn ${isDevBanned?"au-act-btn--dev-active":"au-act-btn--dev"}`}
            disabled={isAnyLoading}
            onClick={() => askConfirm({
              title: isDevBanned ? "Unban Device" : "Ban Device",
              body: `${isDevBanned?"Unban":"Ban"} device for <strong>@${user.username}</strong>?`,
              confirmLabel: isDevBanned ? "Unban" : "Ban Device",
              danger: !isDevBanned,
              action: () => toggleDeviceBan(user),
            })}>
            {actionLoading===`dev_${user.objectId}` ? <span className="au-btn-spin"/> : isDevBanned ? "📱 Unban Dev" : "📵 Ban Dev"}
          </button>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     VIEW USER MODAL
  ════════════════════════════════════════════════════════ */
  if (viewUser) {
    const clr = getAvatarColor(viewUser.username);
    const devBan = deviceBanMap[viewUser.objectId] || { hasBan:false, status:false };
    return (
      <div className="au-profile-overlay">
        <div className="au-profile-modal">
          <button className="au-back-btn" onClick={() => setViewUser(null)}>← Back</button>
          <div className="au-profile-avatar-wrap">
            {viewUser.avatar
              ? <img src={viewUser.avatar} alt={viewUser.username} className="au-profile-avatar"/>
              : <div className="au-profile-avatar au-profile-avatar--init" style={{background:clr}}>
                  {getInitial(viewUser.name)}
                </div>
            }
            <span className={`au-profile-status-dot ${viewUser.status==="suspended"?"is-suspended":"is-active"}`}/>
          </div>
          <h2 className="au-profile-name">{viewUser.name}</h2>
          <p className="au-profile-uname au-copyable"
            onClick={() => copyText(viewUser.username, showToast)}>
            @{viewUser.username} <span className="au-copy-icon">⎘</span>
          </p>
          {/* Status badges row */}
          <div className="au-profile-badges">
            <span className={`au-status-badge ${viewUser.status==="suspended"?"is-suspended":"is-active"}`}>
              {viewUser.status==="suspended"?"Suspended":"Active"}
            </span>
            {viewUser.is_banned && <span className="au-status-badge is-blocked">🔒 Blocked</span>}
            {devBan.status && <span className="au-status-badge is-devbanned">📵 Device Banned</span>}
          </div>

          <div className="au-profile-grid">
            {[
              { label:"UID",       value:viewUser.uid,      copy:true  },
              // { label:"Coins",     value:viewUser.coin,     copy:false },
              { label:"Gender",    value:viewUser.gender,   copy:false },
              { label:"Status",    value:viewUser.status,   copy:false },
              // { label:"Mode",      value:viewUser.mode,     copy:false },
              { label:"Email",     value:viewUser.email,    copy:true  },
              { label:"Device ID", value:viewUser.device_id||"—", copy:!!viewUser.device_id },
              { label:"Birthday",  value:viewUser.birthday?new Date(viewUser.birthday).toLocaleDateString("en-GB"):"—", copy:false },
              { label:"Joined",    value:timeAgo(viewUser.createdAt), copy:false },
              { label:"Blocked",   value:viewUser.is_banned?"Yes":"No", copy:false },
              { label:"Dev Banned",value:devBan.status?"Yes":"No", copy:false },
            ].map(({ label, value, copy }) => (
              <div key={label}
                className={`au-profile-field ${copy?"au-copyable":""}`}
                onClick={copy ? () => copyText(String(value), showToast) : undefined}
                title={copy?"Click to copy":undefined}>
                <span className="au-field-label">{label}</span>
                <span className="au-field-value">
                  {String(value??"—")}
                  {copy && <span className="au-copy-icon">⎘</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="au-profile-actions">
            <button className="au-profile-edit-btn"
              onClick={() => { setViewUser(null); setEditUser(viewUser); }}>
              ✎ Edit User
            </button>
            <button
              className={`au-profile-suspend-btn ${viewUser.status==="suspended"?"is-activate":""}`}
              onClick={() => {
                setViewUser(null);
                askConfirm({
                  title: viewUser.status==="suspended"?"Activate":"Suspend",
                  body: `${viewUser.status==="suspended"?"Activate":"Suspend"} <strong>@${viewUser.username}</strong>?`,
                  confirmLabel: viewUser.status==="suspended"?"Activate":"Suspend",
                  danger: viewUser.status!=="suspended",
                  action: () => toggleSuspend(viewUser),
                });
              }}>
              {viewUser.status==="suspended"?"✓ Activate":"⊘ Suspend"}
            </button>
            <button
              className={`au-profile-block-btn ${viewUser.is_banned?"is-unblock":""}`}
              onClick={() => {
                setViewUser(null);
                askConfirm({
                  title: viewUser.is_banned?"Unblock User":"Block User",
                  body: `${viewUser.is_banned?"Unblock":"Block"} <strong>@${viewUser.username}</strong>?`,
                  confirmLabel: viewUser.is_banned?"Unblock":"Block",
                  danger: !viewUser.is_banned,
                  action: () => toggleUserBan(viewUser),
                });
              }}>
              {viewUser.is_banned?"🔓 Unblock":"🔒 Block"}
            </button>
            {viewUser.device_id && (
              <button
                className={`au-profile-dev-btn ${devBan.status?"is-unban":""}`}
                onClick={() => {
                  setViewUser(null);
                  askConfirm({
                    title: devBan.status?"Unban Device":"Ban Device",
                    body: `${devBan.status?"Unban":"Ban"} device for <strong>@${viewUser.username}</strong>?`,
                    confirmLabel: devBan.status?"Unban Device":"Ban Device",
                    danger: !devBan.status,
                    action: () => toggleDeviceBan(viewUser),
                  });
                }}>
                {devBan.status?"📱 Unban Device":"📵 Ban Device"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     EDIT MODAL
  ════════════════════════════════════════════════════════ */
  if (editUser) {
    return (
      <div className="au-edit-overlay">
        <div className="au-edit-modal">
          <button className="au-back-btn" onClick={() => setEditUser(null)}>← Back</button>
          <h2 className="au-edit-title">Edit User</h2>
          <p className="au-edit-subtitle">@{editUser.username}</p>
          <div className="au-edit-fields">
            {[
              { key:"username", label:"Username", type:"text" },
              { key:"first_name", label:"First Name", type:"text" },
              { key:"last_name", label:"Last Name", type:"text" },
              { key:"country", label:"Country", type:"text" },

              // { key:"coin", label:"Coins", type:"number" },
              { key:"credit", label:"Credit", type:"number" },
              { key:"earning", label:"Earning", type:"number" },
              { key:"creditSent", label:"Credit Sent", type:"number" },

              // { key:"gender", label:"Gender", type:"text" },
              // { key:"mode", label:"Mode", type:"text" },
              { key:"bio", label:"Bio", type:"text" },
            ].map(({ key, label, type }) => (
              <div key={key} className="au-edit-field">
                <label className="au-edit-label">{label}</label>
                <input className="au-edit-input" type={type}
                  value={editUser[key]||""}
                  onChange={e => setEditUser(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}/>
              </div>
            ))}

           



          <div className="au-edit-field au-avatar-field">

            <label className="au-edit-label">Profile Avatar</label>

            {/* AVATAR PREVIEW */}
            <div className="au-avatar-box">
              {editUser.avatar ? (
                typeof editUser.avatar === "string" ? (
                  <img src={editUser.avatar} alt="avatar" className="au-avatar-img" />
                ) : (
                  <div className="au-avatar-placeholder">New Image Selected</div>
                )
              ) : (
                <div className="au-avatar-placeholder">No Avatar</div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="au-avatar-actions">

              {/* UPLOAD */}
              <label className="au-avatar-upload">
                📤 Upload
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const parseFile = new Parse.File(file.name, file);
                    await parseFile.save();

                    setEditUser(p => ({
                      ...p,
                      avatar: parseFile
                    }));
                  }}
                />
              </label>

              {/* DELETE */}
              {editUser.avatar && (
                <button
                  type="button"
                  className="au-avatar-delete"
                  onClick={() =>
                    setEditUser(p => ({
                      ...p,

                      // for delete avatar it will be null insted of ""
                      avatar: ""
                    }))
                  }
                >
                  🗑 Remove
                </button>
              )}
            </div>
          </div>







            <div className="au-edit-field">
              <label className="au-edit-label">Gender</label>

              <select
                className="au-edit-input"
                value={editUser.gender || ""}
                onChange={(e) =>
                  setEditUser(p => ({ ...p, gender: e.target.value }))
                }
              >
                <option value="">Select gender</option>
                  <option value="male">👨 Male</option>
                  <option value="female">👩 Female</option>
                  <option value="other">⚧ Other</option>
              </select>
            </div>



          </div>
          <div className="au-edit-actions">
            <button className="au-edit-cancel" onClick={() => setEditUser(null)}>Cancel</button>
            <button className="au-edit-save" onClick={saveEdit}
              disabled={actionLoading === `edit_${editUser.objectId}`}>
              {actionLoading===`edit_${editUser.objectId}` ? <span className="au-btn-spin"/> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     MAIN LIST
  ════════════════════════════════════════════════════════ */
  return (
    <div className="au-root">

      {/* Toast */}
      {toast && (
        <div className={`au-toast au-toast--${toast.type}`}>
          <span className="au-toast-icon">
            {toast.type==="success"?"✓":toast.type==="error"?"✕":toast.type==="copy"?"⎘":"i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Generic confirm modal */}
      <ConfirmModal
        data={confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => { if (confirmModal?.action) confirmModal.action(); }}
        loading={!!actionLoading}
      />

      {/* ── Header ── */}
      <div className="au-header">
        <div className="au-header-left">
          <span className="au-eyebrow">User Management</span>
          <h1 className="au-title">All Users</h1>
          <span className="au-subtitle">
            {statCounts.total.toLocaleString()} total · {statCounts.active} active ·
            {" "}{statCounts.suspended} suspended · {statCounts.banned} blocked
          </span>
        </div>
        <div className="au-header-right">
          <div className="au-view-toggle">
            <button className={`au-toggle-btn ${viewMode==="list"?"is-active":""}`} onClick={() => setViewMode("list")}>
              ☰ List
            </button>
            <button className={`au-toggle-btn ${viewMode==="card"?"is-active":""}`} onClick={() => setViewMode("card")}>
              ⊞ Cards
            </button>
          </div>
          <button className="au-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? <span className="au-btn-spin"/> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat Pills ── */}
      <div className="au-stat-pills">
        {[
          { label:"All",       val:statCounts.total,     color:"violet", key:"all"       },
          { label:"Active",    val:statCounts.active,    color:"green",  key:"active"    },
          { label:"Suspended", val:statCounts.suspended, color:"amber",  key:"suspended" },
          { label:"Blocked",   val:statCounts.banned,    color:"red",    key:"banned"    },
        ].map((s, i) => (
          <button key={s.key}
            className={`au-stat-pill au-stat-pill--${s.color} ${statusFilter===s.key?"is-active":""}`}
            style={{ animationDelay:`${i*60}ms` }}
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
            onChange={e => setSearchInput(e.target.value)}/>
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
          {/* <option value="coins">Most Coins</option> */}
        </select>
        <span className="au-result-count">
          {!loading && `${totalCount.toLocaleString()} result${totalCount!==1?"s":""}`}
        </span>
      </div>

      {/* Page indicator */}
      {!loading && totalPages > 1 && (
        <div className="au-page-indicator">
          <span>Page <strong>{page+1}</strong> of <strong>{totalPages}</strong></span>
          <span className="au-page-indicator-dot"/>
          <span>Records <strong>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,totalCount)}</strong> of <strong>{totalCount}</strong></span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="au-loading">
          <div className="au-spinner-wrap">
            <div className="au-spinner"/>
            <div className="au-spinner au-spinner--2"/>
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
        <div className={`au-card-grid ${animated?"is-animated":""}`}>
          {users.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const suspended = user.status === "suspended";
            const devBan    = deviceBanMap[user.objectId] || { status:false };
            return (
              <div key={user.objectId}
                className={`au-card ${suspended?"au-card--suspended":""} ${user.is_banned?"au-card--blocked":""}`}
                style={{ animationDelay:`${i*35}ms` }}>

                {/* Tags */}
                <div className="au-card-tags">
                  {suspended   && <span className="au-card-tag au-card-tag--suspend">Suspended</span>}
                  {user.is_banned && <span className="au-card-tag au-card-tag--blocked">🔒 Blocked</span>}
                  {devBan.status  && <span className="au-card-tag au-card-tag--dev">📵 Dev Banned</span>}
                </div>

                {/* Avatar */}
                <div className="au-card-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="au-card-av"/>
                    : <div className="au-card-av au-card-av--init" style={{background:clr}}>
                        {getInitial(user.name)}
                      </div>
                  }
                  <div className="au-card-av-ring" style={{borderColor:clr+"55"}}/>
                  <div className={`au-card-status-dot ${suspended?"is-suspended":"is-active"}`}/>
                </div>

                <div className="au-card-info">
                  <p className="au-card-name">{user.name}</p>
                  <p className="au-card-uname au-copyable"
                    onClick={() => copyText(user.username, showToast)}>
                    @{user.username} <span className="au-copy-icon">⎘</span>
                  </p>
                </div>

                <div className="au-card-uid au-copyable"
                  onClick={() => copyText(user.uid, showToast)}>
                  <span className="au-uid-label">UID</span>
                  <span className="au-uid-val">{user.uid}</span>
                  <span className="au-copy-icon">⎘</span>
                </div>

                <div className="au-card-meta">
                  <div className="au-card-meta-row">
                    {/* <span className="au-meta-key">Coins</span> */}
                    <span className="au-meta-val au-meta-val--gold">🪙 {user.coin.toLocaleString()}</span>
                  </div>
                  <div className="au-card-meta-row">
                    <span className="au-meta-key">Gender</span>
                    <span className="au-meta-val">{user.gender}</span>
                  </div>
                  <div className="au-card-meta-row">
                    <span className="au-meta-key">Joined</span>
                    <span className="au-meta-val">{timeAgo(user.createdAt)}</span>
                  </div>
                  {user.device_id && (
                    <div className="au-card-meta-row">
                      <span className="au-meta-key">Device</span>
                      <span className="au-meta-val au-copyable"
                        onClick={() => copyText(user.device_id, showToast)}>
                        {user.device_id.slice(0,10)}… ⎘
                      </span>
                    </div>
                  )}
                </div>

                <ActionButtons user={user} compact={false}/>
              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`au-list-wrap ${animated?"is-animated":""}`}>
          <div className="au-list-head">
            <span/>
            <span className="au-list-hcol">Name / Username</span>
            <span className="au-list-hcol">UID</span>
            {/* <span className="au-list-hcol">Coins</span> */}
            <span className="au-list-hcol">Joined</span>
            <span className="au-list-hcol">Status</span>
            <span className="au-list-hcol au-list-hcol--right">Actions</span>
          </div>

          {users.map((user, i) => {
            const clr       = getAvatarColor(user.username);
            const suspended = user.status === "suspended";
            const devBan    = deviceBanMap[user.objectId] || { status:false };
            return (
              <div key={user.objectId}
                className={`au-list-row ${suspended?"au-list-row--suspended":""} ${user.is_banned?"au-list-row--blocked":""}`}
                style={{ animationDelay:`${i*22}ms` }}>

                {/* Avatar */}
                <div className="au-list-av-wrap">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.username} className="au-list-av"/>
                    : <div className="au-list-av au-list-av--init" style={{background:clr}}>
                        {getInitial(user.name)}
                      </div>
                  }
                  {/* status dot */}
                  <span className={`au-list-dot ${suspended?"red":user.is_banned?"orange":"green"}`}/>
                </div>

                {/* Name */}
                <div className="au-list-name-cell">
                  <span className="au-list-name">{user.name}</span>
                  <div style={{display:"flex",gap:"5px",alignItems:"center",flexWrap:"wrap"}}>
                    <span className="au-list-uname au-copyable"
                      onClick={() => copyText(user.username, showToast)}>
                      @{user.username} <span className="au-copy-icon">⎘</span>
                    </span>
                    {user.is_banned  && <span className="au-mini-badge au-mini-badge--blocked">🔒</span>}
                    {devBan.status   && <span className="au-mini-badge au-mini-badge--dev">📵</span>}
                  </div>
                </div>

                {/* UID */}
                <div className="au-list-uid-cell">
                  <span className="au-list-uid au-copyable"
                    onClick={() => copyText(user.uid, showToast)}>
                    {user.uid} <span className="au-copy-icon">⎘</span>
                  </span>
                </div>

                {/* Coins */}
                {/* <div className="au-list-coin-cell">
                  <span className="au-list-coin">{user.coin.toLocaleString()}</span>
                </div> */}

                {/* Joined */}
                <div className="au-list-time-cell">
                  <span className="au-list-time">{timeAgo(user.createdAt)}</span>
                </div>

                {/* Status */}
                <div className="au-list-status-cell">
                  <span className={`au-status-badge ${suspended?"is-suspended":"is-active"}`}>
                    {suspended ? "Suspended" : "Active"}
                  </span>
                </div>

                {/* Actions */}
                <ActionButtons user={user} compact={true}/>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="au-pagination">
          <button className="au-page-btn au-page-nav" disabled={page===0||loading} onClick={() => changePage(0)}>«</button>
          <button className="au-page-btn au-page-nav" disabled={page===0||loading} onClick={() => changePage(page-1)}>‹</button>
          {pageRange[0] > 0 && (
            <><button className="au-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0]>1 && <span className="au-page-ellipsis">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i} className={`au-page-btn au-page-num ${page===i?"is-active":""}`}
              onClick={() => changePage(i)}>{i+1}</button>
          ))}
          {pageRange[pageRange.length-1] < totalPages-1 && (
            <>{pageRange[pageRange.length-1]<totalPages-2&&<span className="au-page-ellipsis">…</span>}
            <button className="au-page-btn" onClick={() => changePage(totalPages-1)}>{totalPages}</button></>
          )}
          <button className="au-page-btn au-page-nav" disabled={page===totalPages-1||loading} onClick={() => changePage(page+1)}>›</button>
          <button className="au-page-btn au-page-nav" disabled={page===totalPages-1||loading} onClick={() => changePage(totalPages-1)}>»</button>
          <span className="au-page-info">Page {page+1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}