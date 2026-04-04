import React, { useEffect, useState, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AllMessage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight, faTableList, faBorderAll,
  faVideo, faMicrophone, faEnvelope, faEnvelopeOpen,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 25;

/* ── helpers ── */
function copyToClipboard(text, showToast) {
  navigator.clipboard?.writeText(text).then(() => {
    showToast(`Copied!`, "copy");
  }).catch(() => {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand("copy");
    document.body.removeChild(el);
    showToast(`Copied!`, "copy");
  });
}
function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}
function getInitial(str) { return (str || "?").charAt(0).toUpperCase(); }

const TYPE_CONFIG = {
  audioboard_invitation: { label: "Audio Board", color: "#34d399", icon: faMicrophone },
  videoboard_invitation: { label: "Video Board", color: "#5b8af5", icon: faVideo      },
};
function getType(t) {
  return TYPE_CONFIG[t] || { label: t || "Unknown", color: "#6b7a9e", icon: faFilter };
}

/* ── build server-side query ── */
function buildQuery(Message, typeFilter, readFilter, srch) {
  const trim = (srch || "").trim();

  if (trim) {
    const queries = [];
    const qA = new Parse.Query(Message); qA.contains("AuthorId",   trim); queries.push(qA);
    const qR = new Parse.Query(Message); qR.contains("ReceiverId", trim); queries.push(qR);
    const combined = Parse.Query.or(...queries);
    if (typeFilter !== "all") combined.equalTo("messageType", typeFilter);
    if (readFilter === "read")   combined.equalTo("read", true);
    if (readFilter === "unread") combined.equalTo("read", false);
    return combined;
  }

  const q = new Parse.Query(Message);
  if (typeFilter !== "all") q.equalTo("messageType", typeFilter);
  if (readFilter === "read")   q.equalTo("read", true);
  if (readFilter === "unread") q.equalTo("read", false);
  return q;
}

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AllMessages() {
  const [messages,     setMessages]     = useState([]);
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [readFilter,   setReadFilter]   = useState("all");
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(0);
  const [totalCount,   setTotalCount]   = useState(0);
  const [viewMode,     setViewMode]     = useState("list");
  const [toast,        setToast]        = useState(null);
  const [animated,     setAnimated]     = useState(false);
  const [statCounts,   setStatCounts]   = useState({ total: 0, audio: 0, video: 0, unread: 0 });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── stat counts — 4 cheap count() queries in parallel ── */
  const fetchStatCounts = useCallback(async () => {
    try {
      const Message = Parse.Object.extend("Message");
      const mk = { useMasterKey: true };
      const qTotal  = new Parse.Query(Message);
      const qAudio  = new Parse.Query(Message); qAudio.equalTo("messageType",  "audioboard_invitation");
      const qVideo  = new Parse.Query(Message); qVideo.equalTo("messageType",  "videoboard_invitation");
      const qUnread = new Parse.Query(Message); qUnread.equalTo("read", false);
      const [total, audio, video, unread] = await Promise.all([
        qTotal.count(mk), qAudio.count(mk), qVideo.count(mk), qUnread.count(mk),
      ]);
      setStatCounts({ total, audio, video, unread });
    } catch (err) { console.error(err); }
  }, []);

  /* ── fetch page — only PAGE_SIZE records ── */
  const fetchPage = useCallback(async (pageNum, typeF, readF, srch) => {
    setLoading(true);
    setAnimated(false);
    try {
      const Message = Parse.Object.extend("Message");
      const mk = { useMasterKey: true };

      const q      = buildQuery(Message, typeF, readF, srch);
      const countQ = buildQuery(Message, typeF, readF, srch);

      q.descending("createdAt");
      q.limit(PAGE_SIZE);
      q.skip(pageNum * PAGE_SIZE);
      q.select([
        "objectId", "AuthorId", "ReceiverId", "text",
        "messageType", "messageFile", "read",
        "invite_room", "createdAt", "updatedAt",
      ]);

      const [batch, count] = await Promise.all([q.find(mk), countQ.count(mk)]);

      setTotalCount(count);
      setMessages(batch.map(m => {
        const room = m.get("invite_room");
        return {
          objectId:    m.id,
          authorId:    m.get("AuthorId")    || "—",
          receiverId:  m.get("ReceiverId")  || "—",
          text:        m.get("text")        || "—",
          messageType: m.get("messageType") || "—",
          messageFile: m.get("messageFile") || false,
          read:        m.get("read")        || false,
          roomId:      room?.id             || "—",
          createdAt:   m.get("createdAt"),
          updatedAt:   m.get("updatedAt"),
        };
      }));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 60);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPage(page, typeFilter, readFilter, search);
  }, [page, typeFilter, readFilter, search, fetchPage]);

  useEffect(() => { fetchStatCounts(); }, [fetchStatCounts]);

  /* pagination */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageRange  = useMemo(() => {
    const d = 2, r = [];
    for (let i = Math.max(0, page - d); i <= Math.min(totalPages - 1, page + d); i++) r.push(i);
    return r;
  }, [page, totalPages]);
  const changePage = n => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const changeType = t => { setTypeFilter(t); setPage(0); };
  const changeRead = r => { setReadFilter(r); setPage(0); };
  const refresh    = () => { fetchPage(page, typeFilter, readFilter, search); fetchStatCounts(); };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="am-root">

      {/* Toast */}
      {toast && (
        <div className={`am-toast am-toast--${toast.type}`}>
          <span className="am-toast-dot" />{toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="am-header">
        <div className="am-header-left">
          <span className="am-eyebrow">Communication</span>
          <h1 className="am-title">All Messages</h1>
          <span className="am-subtitle">
            {`${statCounts.total.toLocaleString()} total · ${statCounts.unread.toLocaleString()} unread · showing ${messages.length} of ${totalCount}`}
          </span>
        </div>
        <div className="am-header-right">
          <div className="am-view-toggle">
            <button className={`am-toggle-btn ${viewMode === "list" ? "on" : ""}`}
              onClick={() => setViewMode("list")} title="List view">
              <FontAwesomeIcon icon={faTableList} />
            </button>
            <button className={`am-toggle-btn ${viewMode === "card" ? "on" : ""}`}
              onClick={() => setViewMode("card")} title="Card view">
              <FontAwesomeIcon icon={faBorderAll} />
            </button>
          </div>
          <button className="am-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? <span className="am-spin" /> : <FontAwesomeIcon icon={faRotateRight} />}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="am-stat-row">
        {[
          { label: "Total",       val: statCounts.total.toLocaleString(),  color: "#818cf8" },
          { label: "Audio Board", val: statCounts.audio.toLocaleString(),  color: "#34d399" },
          { label: "Video Board", val: statCounts.video.toLocaleString(),  color: "#5b8af5" },
          { label: "Unread",      val: statCounts.unread.toLocaleString(), color: "#f87171" },
        ].map((s, i) => (
          <div key={i} className="am-stat-card" style={{ animationDelay: `${i * 55}ms` }}>
            <span className="am-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="am-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filter pills ── */}
      <div className="am-filters">
        {/* Type filter */}
        <div className="am-filter-group">
          {[
            { key: "all",                    label: "All Types",   color: "#6b7a9e" },
            { key: "audioboard_invitation",  label: "Audio Board", color: "#34d399" },
            { key: "videoboard_invitation",  label: "Video Board", color: "#5b8af5" },
          ].map(f => (
            <button key={f.key}
              className={`am-filter-pill ${typeFilter === f.key ? "on" : ""}`}
              style={typeFilter === f.key ? { borderColor: f.color, color: f.color, background: `${f.color}14` } : {}}
              onClick={() => changeType(f.key)}>
              <span className="am-filter-dot" style={{ background: f.color }} />
              {f.label}
            </button>
          ))}
        </div>

        <div className="am-filter-divider" />

        {/* Read filter */}
        <div className="am-filter-group">
          {[
            { key: "all",    label: "All",    color: "#6b7a9e" },
            { key: "unread", label: "Unread", color: "#f87171" },
            { key: "read",   label: "Read",   color: "#34d399" },
          ].map(f => (
            <button key={f.key}
              className={`am-filter-pill ${readFilter === f.key ? "on" : ""}`}
              style={readFilter === f.key ? { borderColor: f.color, color: f.color, background: `${f.color}14` } : {}}
              onClick={() => changeRead(f.key)}>
              <span className="am-filter-dot" style={{ background: f.color }} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + toolbar ── */}
      <div className="am-toolbar">
        <div className="am-search-wrap">
          <span className="am-search-icon">⌕</span>
          <input className="am-search"
            placeholder="Search by Author ID or Receiver ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="am-search-clear"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}>✕</button>
          )}
        </div>
        {!loading && (
          <span className="am-result-count">{totalCount} result{totalCount !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── Page indicator ── */}
      {!loading && totalPages > 1 && (
        <div className="am-page-indicator">
          <span>Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong></span>
          <span className="am-pi-dot" />
          <span>Records <strong>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong></span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="am-loading">
          <div className="am-loading-ring" />
          <div className="am-loading-ring am-loading-ring--2" />
          <p>Fetching messages…</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="am-empty">
          <div className="am-empty-icon">✉</div>
          <p>No messages found</p>
          <button className="am-empty-reset"
            onClick={() => { setSearchInput(""); setSearch(""); setTypeFilter("all"); setReadFilter("all"); setPage(0); }}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "card" ? (

        /* ════ CARD VIEW ════ */
        <div className={`am-card-grid ${animated ? "in" : ""}`}>
          {messages.map((m, i) => {
            const tc  = getType(m.messageType);
            const clr = getAvatarColor(m.authorId);
            return (
              <div key={m.objectId} className={`am-card ${!m.read ? "am-card--unread" : ""}`}
                style={{ animationDelay: `${i * 35}ms` }}>

                {/* Type + read status */}
                <div className="am-card-head">
                  <span className="am-type-badge"
                    style={{ background: `${tc.color}18`, borderColor: `${tc.color}44`, color: tc.color }}>
                    <FontAwesomeIcon icon={tc.icon} /> {tc.label}
                  </span>
                  <span className={`am-read-badge ${m.read ? "am-read-badge--read" : "am-read-badge--unread"}`}>
                    <FontAwesomeIcon icon={m.read ? faEnvelopeOpen : faEnvelope} />
                    {m.read ? "Read" : "Unread"}
                  </span>
                </div>

                {/* Object ID */}
                <div className="am-card-oid am-copyable"
                  onClick={() => copyToClipboard(m.objectId, showToast)} title="Copy ID">
                  <span className="am-oid-label">ID</span>
                  <span className="am-oid-val">{m.objectId}</span>
                </div>

                {/* Author → Receiver */}
                <div className="am-card-users">
                  <div className="am-card-user">
                    <div className="am-av" style={{ background: clr }}>{getInitial(m.authorId)}</div>
                    <div className="am-card-user-info">
                      <span className="am-card-user-role">From (Author)</span>
                      <span className="am-card-user-id am-copyable"
                        onClick={() => copyToClipboard(m.authorId, showToast)}>{m.authorId}</span>
                    </div>
                  </div>
                  <div className="am-card-arrow">→</div>
                  <div className="am-card-user">
                    <div className="am-av" style={{ background: getAvatarColor(m.receiverId) }}>
                      {getInitial(m.receiverId)}
                    </div>
                    <div className="am-card-user-info">
                      <span className="am-card-user-role">To (Receiver)</span>
                      <span className="am-card-user-id am-copyable"
                        onClick={() => copyToClipboard(m.receiverId, showToast)}>{m.receiverId}</span>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="am-card-text">"{m.text}"</div>

                {/* Room ID + time */}
                <div className="am-card-meta">
                  <div className="am-card-room am-copyable"
                    onClick={() => copyToClipboard(m.roomId, showToast)} title="Copy Room ID">
                    <span className="am-room-label">Room</span>
                    <span className="am-room-val">{m.roomId}</span>
                  </div>
                  <span className="am-card-time">{timeAgo(m.createdAt)}</span>
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* ════ LIST VIEW ════ */
        <div className={`am-list-wrap ${animated ? "in" : ""}`}>

          {/* Header */}
          <div className="am-list-head">
            <span className="am-lh" style={{ width: 36 }}>#</span>
            <span className="am-lh am-lh--grow">Author ID → Receiver ID</span>
            <span className="am-lh am-lh--hide-sm">Room ID</span>
            <span className="am-lh am-lh--center">Type</span>
            <span className="am-lh am-lh--center">Status</span>
            <span className="am-lh am-lh--hide-md">Sent</span>
          </div>

          {messages.map((m, i) => {
            const tc      = getType(m.messageType);
            const authorC = getAvatarColor(m.authorId);
            const recvC   = getAvatarColor(m.receiverId);

            return (
              <div key={m.objectId}
                className={`am-row ${!m.read ? "am-row--unread" : ""} ${animated ? "in" : ""}`}
                style={{ animationDelay: `${i * 22}ms` }}>

                {/* Rank */}
                <div className="am-cell am-cell--rank">
                  <span className="am-rank">{page * PAGE_SIZE + i + 1}</span>
                </div>

                {/* Author → Receiver */}
                <div className="am-cell am-cell--grow">
                  <div className="am-user-pair">
                    <div className="am-av am-av--sm" style={{ background: authorC }}>
                      {getInitial(m.authorId)}
                    </div>
                    <span className="am-user-id am-copyable"
                      onClick={() => copyToClipboard(m.authorId, showToast)}
                      title="Copy Author ID">{m.authorId}</span>
                    <span className="am-arrow">→</span>
                    <div className="am-av am-av--sm" style={{ background: recvC }}>
                      {getInitial(m.receiverId)}
                    </div>
                    <span className="am-user-id am-copyable"
                      onClick={() => copyToClipboard(m.receiverId, showToast)}
                      title="Copy Receiver ID">{m.receiverId}</span>
                  </div>
                  <span className="am-msg-text">"{m.text}"</span>
                </div>

                {/* Room ID */}
                <div className="am-cell am-cell--hide-sm">
                  <span className="am-room-id am-copyable"
                    onClick={() => copyToClipboard(m.roomId, showToast)}
                    title="Copy Room ID">{m.roomId}</span>
                </div>

                {/* Type badge */}
                <div className="am-cell am-cell--center">
                  <span className="am-type-badge am-type-badge--sm"
                    style={{ background: `${tc.color}18`, borderColor: `${tc.color}44`, color: tc.color }}>
                    <FontAwesomeIcon icon={tc.icon} />
                    <span className="am-type-label-hide">{tc.label}</span>
                  </span>
                </div>

                {/* Read status */}
                <div className="am-cell am-cell--center">
                  <span className={`am-read-badge ${m.read ? "am-read-badge--read" : "am-read-badge--unread"}`}>
                    <FontAwesomeIcon icon={m.read ? faEnvelopeOpen : faEnvelope} />
                    <span className="am-read-label-hide">{m.read ? "Read" : "Unread"}</span>
                  </span>
                </div>

                {/* Time */}
                <div className="am-cell am-cell--hide-md">
                  <span className="am-time">{timeAgo(m.createdAt)}</span>
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
            disabled={page === 0 || loading} onClick={() => changePage(0)}>«</button>
          <button className="am-page-btn am-page-nav"
            disabled={page === 0 || loading} onClick={() => changePage(page - 1)}>‹ Prev</button>

          {pageRange[0] > 0 && (
            <><button className="am-page-btn" onClick={() => changePage(0)}>1</button>
            {pageRange[0] > 1 && <span className="am-page-ellipsis">…</span>}</>
          )}
          {pageRange.map(i => (
            <button key={i}
              className={`am-page-btn ${page === i ? "on" : ""}`}
              onClick={() => changePage(i)}>{i + 1}</button>
          ))}
          {pageRange[pageRange.length - 1] < totalPages - 1 && (
            <>{pageRange[pageRange.length - 1] < totalPages - 2 &&
              <span className="am-page-ellipsis">…</span>}
            <button className="am-page-btn" onClick={() => changePage(totalPages - 1)}>{totalPages}</button></>
          )}

          <button className="am-page-btn am-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(page + 1)}>Next ›</button>
          <button className="am-page-btn am-page-nav"
            disabled={page === totalPages - 1 || loading} onClick={() => changePage(totalPages - 1)}>»</button>
          <span className="am-page-info">Page {page + 1} / {totalPages}</span>
        </div>
      )}

    </div>
  );
}