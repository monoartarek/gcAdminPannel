import React, { useEffect, useState, useRef, useCallback } from "react";
import Parse from "../../parseConfig";
import AgoraRTC from "agora-rtc-sdk-ng";
import "./Streaming.css";

const PER_PAGE = 8;
const APP_ID = "YOUR_AGORA_APP_ID"; // Replace with your Agora App ID

const FILTERS = [
  { key: "ALL",   label: "All Streams",  icon: "⬡" },
  { key: "audio", label: "Audio",        icon: "♬" },
  { key: "video", label: "Video",        icon: "▶" },
  { key: "multi", label: "Multi",        icon: "⊞" },
];

export default function LivePage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [data,         setData]         = useState([]);
  const [filter,       setFilter]       = useState("ALL");
  const [page,         setPage]         = useState(0);
  const [viewer,       setViewer]       = useState(null);
  const [remoteUsers,  setRemoteUsers]  = useState([]);
  const [loadingJoin,  setLoadingJoin]  = useState(false);
  const [spotlightId,  setSpotlightId]  = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState("");
  const [isMuted,      setIsMuted]      = useState(false);
  const [localUid,     setLocalUid]     = useState(null);
  const [viewerCount,  setViewerCount]  = useState(0);
  const [toast,        setToast]        = useState(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const clientRef    = useRef(null);
  const chatEndRef   = useRef(null);
  const stageRef     = useRef(null);
  const uidRef       = useRef(Math.floor(Math.random() * 900000) + 100000);

  // ── Toast Helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const q = new Parse.Query("Streaming");
      q.equalTo("streaming", true);
      q.descending("createdAt");
      q.include(["user"]);
      const res = await q.find();
      setData(res);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 5000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Agora: Leave ──────────────────────────────────────────────────────────
  const leave = useCallback(async () => {
    try {
      if (clientRef.current) {
        remoteUsers.forEach(u => {
          u.videoTrack?.stop();
          u.audioTrack?.stop();
        });
        await clientRef.current.leave();
      }
    } catch (e) { console.error(e); }
    clientRef.current = null;
    setRemoteUsers([]);
    setViewer(null);
    setSpotlightId(null);
    setLoadingJoin(false);
    setLocalUid(null);
    setViewerCount(0);
    setChatMessages([]);
    setIsFullscreen(false);
    showToast("Left the stream", "info");
  }, [remoteUsers, showToast]);

  // ── Agora: Join ───────────────────────────────────────────────────────────
  const joinAgora = useCallback(async (item, token, uid) => {
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    clientRef.current = client;
    await client.setClientRole("audience");

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") user.audioTrack?.play();
      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        return exists
          ? prev.map(u => (u.uid === user.uid ? { ...u, ...user } : u))
          : [...prev, user];
      });
      setChatMessages(prev => [
        ...prev,
        { id: Date.now(), system: true, text: `User ${user.uid} joined the stream` },
      ]);
    });

    client.on("user-unpublished", (user, mediaType) => {
      setRemoteUsers(prev =>
        prev.map(u => (u.uid === user.uid ? { ...u, videoTrack: mediaType === "video" ? null : u.videoTrack, audioTrack: mediaType === "audio" ? null : u.audioTrack } : u))
      );
    });

    client.on("user-left", user => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      setSpotlightId(prev => (prev === user.uid ? null : prev));
      setChatMessages(prev => [
        ...prev,
        { id: Date.now(), system: true, text: `User ${user.uid} left the stream` },
      ]);
    });

    client.on("user-joined", user => {
      setViewerCount(c => c + 1);
    });

    await client.join(APP_ID, item.get("streaming_channel"), token, uid);
    setLocalUid(uid);
    setLoadingJoin(false);
    showToast("Joined stream successfully!", "success");
  }, [showToast]);

  // ── Handle Watch ──────────────────────────────────────────────────────────
  const handleWatch = async item => {
    if (loadingJoin) return;
    setLoadingJoin(true);
    try {
      const res = await Parse.Cloud.run("generateAgoraToken", {
        channelName: item.get("streaming_channel"),
        uid: uidRef.current,
      });
      setViewer(item);
      setChatMessages([{ id: Date.now(), system: true, text: `Welcome to ${item.get("username") || "this"}'s stream!` }]);
      await joinAgora(item, res.token || res, uidRef.current);
    } catch (err) {
      showToast("Error joining: " + err.message, "error");
      setLoadingJoin(false);
    }
  };

  // ── Video Rendering ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    const activeUid = spotlightId ?? remoteUsers.find(u => u.videoTrack)?.uid;
    if (!activeUid) return;
    const user = remoteUsers.find(u => u.uid === activeUid);
    const el = document.getElementById("lv-spotlight-player");
    if (user?.videoTrack && el) {
      user.videoTrack.play(el);
    }
  }, [remoteUsers, spotlightId, viewer]);

  // ── Chat Send ─────────────────────────────────────────────────────────────
  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), system: false, uid: localUid || "You", text: chatInput.trim() },
    ]);
    setChatInput("");
  };

  // ── Mute Toggle ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    remoteUsers.forEach(u => {
      if (isMuted) u.audioTrack?.play();
      else u.audioTrack?.stop();
    });
    setIsMuted(v => !v);
    showToast(isMuted ? "Audio unmuted" : "Audio muted", "info");
  };

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!document.fullscreenElement && el) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      req?.call(el);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      exit?.call(document);
    }
  };

  // ── Filter & Paginate ─────────────────────────────────────────────────────
  const filtered = data.filter(i => {
    const matchFilter = filter === "ALL" || i.get("party_type") === filter;
    const matchSearch = !searchQuery ||
      (i.get("username") || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.get("streaming_channel") || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTypeIcon = type => {
    if (type === "video") return "▶";
    if (type === "audio") return "♬";
    if (type === "multi") return "⊞";
    return "⬡";
  };
  const getTypeBadge = type => {
    if (type === "video") return "badge-video";
    if (type === "audio") return "badge-audio";
    if (type === "multi") return "badge-multi";
    return "badge-default";
  };
  const getAvatar = name => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };
  const formatTime = date => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="lv-root">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`lv-toast lv-toast--${toast.type}`}>
          <span className="lv-toast-icon">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── NAVBAR ── */}
      <header className="lv-nav">
        <div className="lv-nav-brand">
          <div className="lv-brand-dot" />
          <span className="lv-brand-name">Pikilive</span>
          <span className="lv-brand-badge">LIVE</span>
        </div>

        <div className="lv-nav-search">
          <span className="lv-search-icon">⌕</span>
          <input
            className="lv-search-input"
            placeholder="Search streams…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
          />
        </div>

        <div className="lv-nav-meta">
          <span className="lv-live-count">{data.length} live</span>
        </div>
      </header>

      {/* ── FILTER TABS ── */}
      <div className="lv-tabs-row">
        <div className="lv-tabs">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`lv-tab ${filter === f.key ? "lv-tab--active" : ""}`}
              onClick={() => { setFilter(f.key); setPage(0); }}
            >
              <span className="lv-tab-icon">{f.icon}</span>
              <span>{f.label}</span>
              <span className="lv-tab-count">
                {f.key === "ALL"
                  ? data.length
                  : data.filter(i => i.get("party_type") === f.key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="lv-result-label">
          {filtered.length} stream{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── GRID ── */}
      <main className="lv-main">
        {pageItems.length === 0 ? (
          <div className="lv-empty">
            <div className="lv-empty-icon">📡</div>
            <p>No live streams right now</p>
            <small>Try a different filter or check back soon</small>
          </div>
        ) : (
          <div className="lv-grid">
            {pageItems.map(item => {
              const username    = item.get("username")    || "Anonymous";
              const image       = item.get("image")       || "";
              const partyType   = item.get("party_type")  || "video";
              const joinedUsers = item.get("joined_users") || [];
              const title       = item.get("title")       || `${username}'s Stream`;
              const description = item.get("description") || "";
              const createdAt   = item.createdAt;

              return (
                <div key={item.id} className="lv-card">
                  <div className="lv-card-thumb">
                    {image ? (
                      <img src={image} alt={username} className="lv-card-img" />
                    ) : (
                      <div className="lv-card-img-placeholder">
                        <span>{getTypeIcon(partyType)}</span>
                      </div>
                    )}
                    <span className="lv-live-pill">● LIVE</span>
                    <span className={`lv-type-pill ${getTypeBadge(partyType)}`}>
                      {getTypeIcon(partyType)} {partyType}
                    </span>
                    <div className="lv-card-viewers">
                      <span className="lv-eye-icon">👁</span>
                      {joinedUsers.length}
                    </div>
                  </div>

                  <div className="lv-card-body">
                    <div className="lv-card-header">
                      <div className="lv-avatar-sm">{getAvatar(username)}</div>
                      <div className="lv-card-meta">
                        <span className="lv-card-username">{username}</span>
                        <span className="lv-card-time">{formatTime(createdAt)}</span>
                      </div>
                    </div>

                    {title && <p className="lv-card-title">{title}</p>}
                    {description && <p className="lv-card-desc">{description}</p>}

                    <div className="lv-card-footer">
                      <div className="lv-card-tags">
                        {item.get("tags") && item.get("tags").slice(0, 2).map((tag, i) => (
                          <span key={i} className="lv-tag-chip">#{tag}</span>
                        ))}
                      </div>
                      <button
                        className="lv-watch-btn"
                        onClick={() => handleWatch(item)}
                        disabled={loadingJoin}
                      >
                        {loadingJoin ? (
                          <span className="lv-spin" />
                        ) : (
                          `${partyType === "audio" ? "Listen" : "Watch"} →`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="lv-pagination">
            <button
              className="lv-page-btn"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >‹ Prev</button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`lv-page-btn lv-page-num ${page === i ? "lv-page-btn--active" : ""}`}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="lv-page-btn"
              disabled={page === totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >Next ›</button>
          </div>
        )}
      </main>

      {/* ── STAGE MODAL ── */}
      {viewer && (
        <div className="lv-stage" ref={stageRef}>

          {/* Header */}
          <div className="lv-stage-nav">
            <div className="lv-stage-brand">
              <span className="lv-pulse" />
              <div className="lv-stage-avatar">{getAvatar(viewer.get("username") || "?")}</div>
              <div>
                <p className="lv-stage-name">{viewer.get("username") || "Stream"}</p>
                <p className="lv-stage-sub">
                  {viewer.get("party_type")} · {remoteUsers.length} participant{remoteUsers.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="lv-stage-actions">
              <div className="lv-viewer-badge">
                <span>👁</span> {viewerCount + remoteUsers.length}
              </div>
              <button className="lv-icon-btn" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                {isFullscreen ? "⊡" : "⛶"}
              </button>
              <button className="lv-leave-btn" onClick={leave}>Leave ✕</button>
            </div>
          </div>

          {/* Body */}
          <div className="lv-stage-body">

            {/* Main Video Area */}
            <div className="lv-main-col">

              {/* Spotlight */}
              <div className="lv-spotlight">
                <div id="lv-spotlight-player" className="lv-spotlight-inner">
                  {!remoteUsers.some(u => u.videoTrack) && (
                    <div className="lv-no-video">
                      <div className="lv-no-video-icon">
                        {viewer.get("party_type") === "audio" ? "♬" : "▶"}
                      </div>
                      <p>Waiting for host…</p>
                      <small>Stream will appear here</small>
                    </div>
                  )}
                </div>

                {/* Overlay info */}
                {remoteUsers.some(u => u.videoTrack) && (
                  <div className="lv-spotlight-label">
                    {getAvatar(viewer.get("username") || "?")} ·{" "}
                    {viewer.get("username") || "Host"}
                  </div>
                )}
              </div>

              {/* Thumbnail strip for multi-user */}
              {remoteUsers.length > 1 && (
                <div className="lv-thumb-strip">
                  {remoteUsers.map(u => (
                    <div
                      key={u.uid}
                      className={`lv-thumb-item ${spotlightId === u.uid ? "lv-thumb-item--active" : ""}`}
                      onClick={() => setSpotlightId(u.uid)}
                    >
                      <div className="lv-thumb-vid">
                        {u.videoTrack ? "📷" : "♬"}
                      </div>
                      <span className="lv-thumb-label">User {String(u.uid).slice(-4)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="lv-controls">
                <button
                  className={`lv-ctrl-btn ${isMuted ? "lv-ctrl-btn--active" : ""}`}
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? "🔇" : "🔊"}
                  <span>{isMuted ? "Unmuted" : "Muted"}</span>
                </button>

                <button className="lv-ctrl-btn" title="Share" onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  showToast("Link copied!", "success");
                }}>
                  🔗
                  <span>Share</span>
                </button>

                <button
                  className="lv-ctrl-btn lv-ctrl-btn--danger"
                  onClick={leave}
                  title="Leave Stream"
                >
                  📞
                  <span>Leave</span>
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lv-sidebar">

              {/* Stream Info */}
              <div className="lv-sidebar-section">
                <p className="lv-sidebar-label">Stream Info</p>
                <div className="lv-info-block">
                  <div className="lv-info-row">
                    <span className="lv-info-key">Channel</span>
                    <span className="lv-info-val">{viewer.get("streaming_channel") || "—"}</span>
                  </div>
                  <div className="lv-info-row">
                    <span className="lv-info-key">Type</span>
                    <span className={`lv-type-badge ${getTypeBadge(viewer.get("party_type"))}`}>
                      {viewer.get("party_type") || "—"}
                    </span>
                  </div>
                  {viewer.get("title") && (
                    <div className="lv-info-row">
                      <span className="lv-info-key">Title</span>
                      <span className="lv-info-val">{viewer.get("title")}</span>
                    </div>
                  )}
                  {viewer.get("description") && (
                    <div className="lv-info-row lv-info-row--col">
                      <span className="lv-info-key">About</span>
                      <span className="lv-info-val lv-info-desc">{viewer.get("description")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Participants */}
              <div className="lv-sidebar-section">
                <p className="lv-sidebar-label">
                  Participants <span className="lv-count-badge">{remoteUsers.length}</span>
                </p>
                <div className="lv-participant-list">
                  {remoteUsers.length === 0 ? (
                    <div className="lv-no-participants">Waiting for others…</div>
                  ) : (
                    remoteUsers.map(u => (
                      <div
                        key={u.uid}
                        className={`lv-participant ${spotlightId === u.uid ? "lv-participant--active" : ""}`}
                        onClick={() => setSpotlightId(prev => prev === u.uid ? null : u.uid)}
                      >
                        <div className="lv-p-avatar">{String(u.uid).slice(-2)}</div>
                        <div className="lv-p-info">
                          <span className="lv-p-name">User {String(u.uid).slice(-4)}</span>
                          <span className="lv-p-status">
                            {u.videoTrack ? "📷 Video" : "♬ Audio only"}
                          </span>
                        </div>
                        <div className="lv-p-indicators">
                          {u.audioTrack && <span className="lv-ind lv-ind--audio" title="Audio">♬</span>}
                          {u.videoTrack && <span className="lv-ind lv-ind--video" title="Video">▶</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Live Chat */}
              <div className="lv-sidebar-section lv-chat-section">
                <p className="lv-sidebar-label">Live Chat</p>
                <div className="lv-chat-messages">
                  {chatMessages.map(m => (
                    <div key={m.id} className={`lv-chat-msg ${m.system ? "lv-chat-msg--system" : ""}`}>
                      {!m.system && (
                        <span className="lv-chat-user">You</span>
                      )}
                      <span className="lv-chat-text">{m.text}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="lv-chat-input-row">
                  <input
                    className="lv-chat-input"
                    placeholder="Say something…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                  />
                  <button className="lv-chat-send" onClick={sendChat}>➤</button>
                </div>
              </div>

            </aside>
          </div>
        </div>
      )}

      {/* ── LOADING OVERLAY ── */}
      {loadingJoin && !viewer && (
        <div className="lv-loading-overlay">
          <div className="lv-loading-card">
            <div className="lv-spinner" />
            <p>Joining stream…</p>
          </div>
        </div>
      )}
    </div>
  );
}