import React, { useEffect, useState, useCallback } from "react";
import "./Dashboard.css";
import Parse from "../../parseConfig";
import PieChart from "./PieChartMF";

const PAGE_SIZE = 12;

function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function getGenderStyle(gender) {
  const g = (gender || "").toLowerCase();
  if (g === "male")   return { bg: "rgba(79,156,249,0.12)", color: "#4f9cf9", label: "♂ Male" };
  if (g === "female") return { bg: "rgba(244,114,182,0.12)", color: "#f472b6", label: "♀ Female" };
  return { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: gender || "N/A" };
}

const AVATAR_PALETTE = [
  "#6366f1","#06b6d4","#f59e0b","#10b981",
  "#f43f5e","#8b5cf6","#ec4899","#14b8a6",
];

function avatarColor(name) {
  if (!name) return AVATAR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export default function Dashboard() {
  const [users,        setUsers]        = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [search,       setSearch]       = useState("");
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(0);
  const [viewMode,     setViewMode]     = useState("card");
  const [sortBy,       setSortBy]       = useState("newest");
  const [genderFilter, setGenderFilter] = useState("all");

  useEffect(() => { fetchAllUsers(); }, []);

  const fetchAllUsers = async () => {
    try {
      const User = Parse.Object.extend("_User");
      let allUsers = [], skip = 0;
      while (true) {
        const query = new Parse.Query(User);
        query.limit(1000);
        query.skip(skip);
        query.descending("createdAt");
        const results = await query.find();
        if (!results.length) break;
        const batch = results.map(u => {
          const raw = u.get("avatar");
          let avatar = null;
          if (raw && typeof raw.url === "function") avatar = raw.url();
          else if (typeof raw === "string") avatar = raw;
          const braw = u.get("birthday");
          let birthday = "N/A";
          if (braw) birthday = new Date(braw).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
          const lraw = u.get("location");
          let location = "N/A";
          if (lraw) {
            if (typeof lraw === "string") location = lraw;
            else if (lraw.latitude) location = `${lraw.latitude.toFixed(3)}, ${lraw.longitude.toFixed(3)}`;
          }
          return {
            id: u.id,
            name:      u.get("name")     || "N/A",
            username:  u.get("username") || "N/A",
            avatar,
            gender:    u.get("gender")   || "N/A",
            birthday,
            location,
            createdAt: u.createdAt,
          };
        });
        allUsers = [...allUsers, ...batch];
        skip += 1000;
      }
      setUsers(allUsers);
      setFiltered(allUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback((s, sort, gender, src) => {
    let r = [...src];
    if (s) {
      const q = s.toLowerCase();
      r = r.filter(u => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    }
    if (gender !== "all") r = r.filter(u => (u.gender||"").toLowerCase() === gender);
    if (sort === "newest") r.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    if (sort === "oldest") r.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
    if (sort === "name")   r.sort((a,b) => a.name.localeCompare(b.name));
    setFiltered(r);
    setPage(0);
  }, []);

  const handleSearch = e => { setSearch(e.target.value); applyFilters(e.target.value, sortBy, genderFilter, users); };
  const handleSort   = v => { setSortBy(v);       applyFilters(search, v, genderFilter, users); };
  const handleGender = v => { setGenderFilter(v); applyFilters(search, sortBy, v, users); };
  const clearSearch  = ()=> { setSearch("");      applyFilters("", sortBy, genderFilter, users); };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE);
  const changePage = p => { setPage(p); window.scrollTo({top:0,behavior:"smooth"}); };

  const getPageNums = () => {
    const nums = [], d = 2;
    const l = Math.max(0, page-d), r = Math.min(totalPages-1, page+d);
    if (l > 0) { nums.push(0); if (l > 1) nums.push("…"); }
    for (let i = l; i <= r; i++) nums.push(i);
    if (r < totalPages-1) { if (r < totalPages-2) nums.push("…"); nums.push(totalPages-1); }
    return nums;
  };

  const maleCount   = users.filter(u=>(u.gender||"").toLowerCase()==="male").length;
  const femaleCount = users.filter(u=>(u.gender||"").toLowerCase()==="female").length;

  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div className="db-header-left">
          <span className="db-eyebrow">Admin Panel</span>
          <h1 className="db-title">User Management</h1>
        </div>
        <div className="db-header-stats">
          <div className="db-hstat">
            <span className="db-hstat-num">{users.length.toLocaleString()}</span>
            <span className="db-hstat-lbl">Total</span>
          </div>
          <div className="db-hstat db-hstat--blue">
            <span className="db-hstat-num">{maleCount.toLocaleString()}</span>
            <span className="db-hstat-lbl">Male</span>
          </div>
          <div className="db-hstat db-hstat--pink">
            <span className="db-hstat-num">{femaleCount.toLocaleString()}</span>
            <span className="db-hstat-lbl">Female</span>
          </div>
        </div>
      </div>

      {/* ── Analytics ── */}
      <PieChart />

      {/* ── Section Title + Toolbar ── */}
      <div className="db-section-head">
        <div className="db-section-title-row">
          <h2 className="db-section-title">All Users</h2>
          <span className="db-section-count">{filtered.length.toLocaleString()}</span>
        </div>

        <div className="db-toolbar">
          <div className="db-toolbar-left">
            <div className="db-search-wrap">
              <span className="db-search-ico">⌕</span>
              <input
                className="db-search"
                placeholder="Search name or username…"
                value={search}
                onChange={handleSearch}
              />
              {search && <button className="db-search-clr" onClick={clearSearch}>✕</button>}
            </div>
            <select className="db-select" value={genderFilter} onChange={e=>handleGender(e.target.value)}>
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <select className="db-select" value={sortBy} onChange={e=>handleSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">A – Z</option>
            </select>
          </div>

          <div className="db-view-toggle">
            <button className={`db-vbtn ${viewMode==="card"?"is-on":""}`} onClick={()=>setViewMode("card")} title="Card view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
              </svg>
            </button>
            <button className={`db-vbtn ${viewMode==="list"?"is-on":""}`} onClick={()=>setViewMode("list")} title="List view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
                <rect x="1" y="12" width="14" height="2" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="db-loading">
          <div className="db-load-rings">
            <div className="db-load-ring"/>
            <div className="db-load-ring db-load-ring--2"/>
          </div>
          <p>Loading users…</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="db-empty">
          <div className="db-empty-ico">◎</div>
          <p>No users found</p>
          <small>Try adjusting your search or filters</small>
        </div>
      ) : viewMode === "card" ? (

        <div className="db-cards">
          {paginated.map((user, i) => {
            const gs = getGenderStyle(user.gender);
            const ac = avatarColor(user.name);
            return (
              <div key={user.id} className="db-card" style={{animationDelay:`${i*35}ms`}}>
                <div className="db-card-hero" style={{background:`linear-gradient(135deg, ${ac}22 0%, ${ac}08 100%)`}}>
                  <div className="db-card-av-wrap">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.name} className="db-card-av"/>
                      : <div className="db-card-av db-card-av--init" style={{background:ac}}>{getInitial(user.name)}</div>
                    }
                    <span className="db-card-dot"/>
                  </div>
                  <span className="db-card-gbadge" style={{background:gs.bg, color:gs.color}}>{gs.label}</span>
                </div>
                <div className="db-card-body">
                  <div className="db-card-names">
                    <span className="db-card-name">{user.name}</span>
                    <span className="db-card-uname">@{user.username}</span>
                  </div>
                  <div className="db-card-divider"/>
                  <div className="db-card-fields">
                    <div className="db-card-field">
                      <span className="db-cf-ico">🎂</span>
                      <div className="db-cf-text">
                        <span className="db-cf-label">Birthday</span>
                        <span className="db-cf-val">{user.birthday}</span>
                      </div>
                    </div>
                    <div className="db-card-field">
                      <span className="db-cf-ico">📍</span>
                      <div className="db-cf-text">
                        <span className="db-cf-label">Location</span>
                        <span className="db-cf-val db-cf-val--clamp">{user.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        <div className="db-list-wrap">
          <div className="db-list-head">
            <span>User</span>
            <span>Gender</span>
            <span>Birthday</span>
            <span>Location</span>
          </div>
          <div className="db-list-body">
            {paginated.map((user, i) => {
              const gs = getGenderStyle(user.gender);
              const ac = avatarColor(user.name);
              return (
                <div key={user.id} className="db-list-row" style={{animationDelay:`${i*25}ms`}}>
                  <div className="db-list-user">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.name} className="db-list-av"/>
                      : <div className="db-list-av db-list-av--init" style={{background:ac}}>{getInitial(user.name)}</div>
                    }
                    <div className="db-list-names">
                      <span className="db-list-name">{user.name}</span>
                      <span className="db-list-uname">@{user.username}</span>
                    </div>
                  </div>
                  <span className="db-list-gbadge" style={{background:gs.bg, color:gs.color}}>{gs.label}</span>
                  <span className="db-list-bday">{user.birthday}</span>
                  <span className="db-list-loc">{user.location}</span>
                </div>
              );
            })}
          </div>
        </div>

      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="db-pager">
          <div className="db-pager-controls">
            <button className="db-pg-arrow" disabled={page===0} onClick={()=>changePage(0)} title="First">«</button>
            <button className="db-pg-arrow" disabled={page===0} onClick={()=>changePage(page-1)} title="Prev">‹</button>

            <div className="db-pg-nums">
              {getPageNums().map((p,i) =>
                p==="…"
                  ? <span key={`d${i}`} className="db-pg-dots">…</span>
                  : <button key={p} className={`db-pg-num ${page===p?"is-on":""}`} onClick={()=>changePage(p)}>{p+1}</button>
              )}
            </div>

            <button className="db-pg-arrow" disabled={page===totalPages-1} onClick={()=>changePage(page+1)} title="Next">›</button>
            <button className="db-pg-arrow" disabled={page===totalPages-1} onClick={()=>changePage(totalPages-1)} title="Last">»</button>
          </div>
          <span className="db-pager-info">Page {page+1} / {totalPages} · {filtered.length.toLocaleString()} users</span>
        </div>
      )}

    </div>
  );
}