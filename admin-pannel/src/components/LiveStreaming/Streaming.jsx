import React, { useEffect, useState, useRef, useCallback } from "react";
import Parse from "../../parseConfig";
import AgoraRTC from "agora-rtc-sdk-ng";
import "./Streaming.css";

/* ═══════════════════════════════════════════════
   Live Streaming — Admin Panel
   Uses generateAgoraToken Cloud Function
   res.appId + res.token → exactly like your
   working version
═══════════════════════════════════════════════ */

const PER_PAGE = 12;
const FILTERS  = [
  { key: "ALL",   label: "All",   icon: "⬡" },
  { key: "audio", label: "Audio", icon: "♬" },
  { key: "video", label: "Video", icon: "▶" },
  { key: "multi", label: "Multi", icon: "⊞" },
];

/* ── helpers ── */
function tc(type) {
  if (type==="video") return { bg:"rgba(91,168,245,0.15)", bd:"rgba(91,168,245,0.4)", tx:"#5ba8f5" };
  if (type==="audio") return { bg:"rgba(129,140,248,0.15)",bd:"rgba(129,140,248,0.4)",tx:"#818cf8" };
  if (type==="multi") return { bg:"rgba(34,211,238,0.15)", bd:"rgba(34,211,238,0.4)", tx:"#22d3ee" };
  return               { bg:"rgba(148,163,184,0.12)",bd:"rgba(148,163,184,0.3)", tx:"#94a3b8" };
}
function icon(type) {
  if (type==="video") return "▶";
  if (type==="audio") return "♬";
  if (type==="multi") return "⊞";
  return "⬡";
}
function ini(name="") {
  return name.trim().split(/\s+/).map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?";
}
function imgUrl(v) {
  if (!v) return "";
  if (typeof v==="string") return v;
  if (v.url) return v.url;
  return "";
}
function ago(d) {
  if (!d) return "";
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s<60)   return `${s}s ago`;
  if (s<3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}
function hhmm(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}

export default function LiveStreaming() {

  /* ── state ── */
  const [streams,     setStreams]     = useState([]);
  const [filter,      setFilter]      = useState("ALL");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(0);
  const [toast,       setToast]       = useState(null);

  const [viewer,      setViewer]      = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [joining,     setJoining]     = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [spotUid,     setSpotUid]     = useState(null);
  const [vCount,      setVCount]      = useState(0);

  const [comments,    setComments]    = useState([]);
  const [cmtLoading,  setCmtLoading]  = useState(false);
  const [tab,         setTab]         = useState("comments");
  const [cutModal,    setCutModal]    = useState(null);

  const clientRef  = useRef(null);
  const chatEnd    = useRef(null);
  const cmtTimer   = useRef(null);
  const uidRef     = useRef(Math.floor(Math.random()*900000)+100000);

  /* ── toast ── */
  const toast$ = useCallback((msg, type="info") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  }, []);

  /* ══════════════════════════════════════════
     FETCH STREAMS — every 6s
  ══════════════════════════════════════════ */
  const fetchStreams = useCallback(async () => {
    try {
      const q = new Parse.Query("Streaming");
      q.equalTo("streaming", true);
      q.descending("createdAt");
      q.limit(200);
      const res = await q.find({ useMasterKey: true });
      setStreams(res);
    } catch(e){ console.error(e); }
  }, []);

  useEffect(() => {
    fetchStreams();
    const t = setInterval(fetchStreams, 6000);
    return () => clearInterval(t);
  }, [fetchStreams]);

  /* ══════════════════════════════════════════
     FETCH COMMENTS — SteamingComments
     Fields: message, name, image, UserLevel,
             room_id, sendAt
  ══════════════════════════════════════════ */
  const fetchComments = useCallback(async (roomId) => {
    if (!roomId) return;
    setCmtLoading(true);
    try {
      const q = new Parse.Query("SteamingComments");
      q.equalTo("room_id", roomId);
      q.descending("sendAt");
      q.limit(80);
      const res = await q.find({ useMasterKey: true });
      setComments(res.map(c=>({
        id:      c.id,
        msg:     c.get("message")   || "",
        name:    c.get("name")      || "Anonymous",
        image:   c.get("image")     || null,
        level:   c.get("UserLevel") || 0,
        at:      c.get("sendAt")    || c.createdAt,
      })).reverse());
    } catch(e){ console.error(e); }
    finally { setCmtLoading(false); }
  }, []);

  useEffect(()=>{
    chatEnd.current?.scrollIntoView({behavior:"smooth"});
  }, [comments]);

  /* ══════════════════════════════════════════
     LEAVE
  ══════════════════════════════════════════ */
  const leave = useCallback(async () => {
    clearInterval(cmtTimer.current);
    try {
      if (clientRef.current) {
        remoteUsers.forEach(u=>{ u.videoTrack?.stop(); u.audioTrack?.stop(); });
        await clientRef.current.leave();
      }
    } catch(e){ console.error(e); }
    clientRef.current = null;
    setRemoteUsers([]);
    setViewer(null);
    setSpotUid(null);
    setJoining(false);
    setVCount(0);
    setComments([]);
    setMuted(false);
  }, [remoteUsers]);

  /* ══════════════════════════════════════════
     JOIN — uses res.appId + res.token
     exactly like your working version
  ══════════════════════════════════════════ */
  const joinStream = async (item) => {
    if (joining) return;
    setJoining(true);
    setViewer(item);
    setTab("comments");

    const channel = item.get("streaming_channel");
    const uid     = uidRef.current;
    const roomId  = item.id;

    fetchComments(roomId);
    clearInterval(cmtTimer.current);
    cmtTimer.current = setInterval(()=>fetchComments(roomId), 5000);

    try {
      /* ── Try Cloud Function first ── */
      let appId = "0f433156502f450597d37a18512aac65"; // fallback
      let token = null;

      try {
        const res = await Parse.Cloud.run("generateAgoraToken", {
          channelName: channel,
          uid:         uid,
        });
        console.log("Cloud Function result:", JSON.stringify(res));

        /* Handle all possible response formats */
        if (res && typeof res === "object") {
          token = res.token || res.Token || res.accessToken || null;
          appId = res.appId || res.AppId || res.app_id || appId;
        } else if (typeof res === "string" && res.length > 10) {
          token = res; // function returned token string directly
        }
      } catch (cfErr) {
        console.warn("Cloud Function error:", cfErr.message);
      }

      if (!token) {
        throw new Error(
          "Cloud Function returned no token. " +
          "Please add AgoraAppID and AgoraAppCertificate to your AppSettings Parse class."
        );
      }

      /* ── Agora join ── */
      const client = AgoraRTC.createClient({ mode:"live", codec:"vp8" });
      clientRef.current = client;
      await client.setClientRole("audience");

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType==="audio") user.audioTrack?.play();
        if (mediaType==="video") {
          /* render video into our fixed player div */
          setTimeout(()=>{
            const el = document.getElementById("lv-video-player");
            if (el && user.videoTrack) user.videoTrack.play(el);
          }, 100);
        }
        setRemoteUsers(prev=>{
          const exists = prev.find(u=>u.uid===user.uid);
          return exists
            ? prev.map(u=>u.uid===user.uid?{...u,...user}:u)
            : [...prev,user];
        });
      });

      client.on("user-unpublished", (user, mediaType)=>{
        setRemoteUsers(prev=>prev.map(u=>u.uid===user.uid?{
          ...u,
          videoTrack: mediaType==="video"?null:u.videoTrack,
          audioTrack: mediaType==="audio"?null:u.audioTrack,
        }:u));
      });

      client.on("user-left", user=>{
        setRemoteUsers(prev=>prev.filter(u=>u.uid!==user.uid));
        setSpotUid(prev=>prev===user.uid?null:prev);
      });

      client.on("user-joined", ()=>setVCount(c=>c+1));

      await client.join(appId, channel, token, uid);
      setJoining(false);
      toast$("Joined stream!", "success");

    } catch(err) {
      console.error("Join failed:", err);
      toast$("Join failed: " + err.message, "error");
      leave();
    }
  };

  /* ── spotlight ── */
  useEffect(()=>{
    if (!viewer) return;
    const targetUid = spotUid ?? remoteUsers.find(u=>u.videoTrack)?.uid;
    if (!targetUid) return;
    const user = remoteUsers.find(u=>u.uid===targetUid);
    const el   = document.getElementById("lv-video-player");
    if (user?.videoTrack && el) user.videoTrack.play(el);
  }, [remoteUsers, spotUid, viewer]);

  /* ── mute ── */
  const toggleMute = () => {
    remoteUsers.forEach(u=>{ if(muted) u.audioTrack?.play(); else u.audioTrack?.stop(); });
    setMuted(v=>!v);
  };

  /* ══════════════════════════════════════════
     CUT STREAM
  ══════════════════════════════════════════ */
  const cutStream = async () => {
    if (!cutModal) return;
    const item = cutModal;
    setCutModal(null);
    try {
      const obj = await new Parse.Query("Streaming").get(item.id,{useMasterKey:true});
      obj.set("streaming", false);
      await obj.save(null,{useMasterKey:true});
      toast$(`Stream cut: ${item.get("username")||"unknown"}`, "success");
      if (viewer?.id===item.id) leave();
      fetchStreams();
    } catch(err){ toast$("Cut failed: "+err.message,"error"); }
  };

  /* ── filter + paginate ── */
  const filtered = streams.filter(i=>{
    const ok   = filter==="ALL" || i.get("party_type")===filter;
    const q    = search.toLowerCase();
    const srch = !q ||
      (i.get("username")||"").toLowerCase().includes(q) ||
      (i.get("audio_room_title")||"").toLowerCase().includes(q);
    return ok && srch;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE);

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="ls-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`ls-toast ls-toast--${toast.type}`}>
          <span className="ls-toast-dot"/>
          {toast.msg}
        </div>
      )}

      {/* ── Cut Confirm Modal ── */}
      {cutModal && (
        <div className="ls-overlay ls-overlay--modal" onClick={()=>setCutModal(null)}>
          <div className="ls-cut-modal" onClick={e=>e.stopPropagation()}>
            <div className="ls-cut-icon">⊘</div>
            <h3 className="ls-cut-title">Cut Stream</h3>
            <p className="ls-cut-desc">
              Force-stop <strong>{cutModal.get("username")||"this"}'s</strong> stream?
              They will be disconnected immediately.
            </p>
            <div className="ls-cut-btns">
              <button className="ls-btn ls-btn--ghost" onClick={()=>setCutModal(null)}>Cancel</button>
              <button className="ls-btn ls-btn--red"   onClick={cutStream}>✕ Cut Stream</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ STREAM GRID ════════ */}
      <div className={`ls-page ${viewer?"ls-page--hidden":""}`}>

        {/* Header */}
        <div className="ls-header">
          <div className="ls-header-left">
            <div className="ls-live-dot"/>
            <h1 className="ls-title">Live Streams</h1>
            <span className="ls-badge">{streams.length} LIVE</span>
          </div>
          <div className="ls-header-right">
            <div className="ls-search-wrap">
              <span className="ls-search-ico">⌕</span>
              <input className="ls-search" placeholder="Search streams…"
                value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>
              {search && <button className="ls-search-x" onClick={()=>{setSearch("");setPage(0);}}>✕</button>}
            </div>
            <button className="ls-icon-btn" onClick={fetchStreams} title="Refresh">↻</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ls-tabs">
          {FILTERS.map(f=>(
            <button key={f.key} className={`ls-tab ${filter===f.key?"on":""}`}
              onClick={()=>{setFilter(f.key);setPage(0);}}>
              {f.icon} {f.label}
              <span className="ls-tab-ct">
                {f.key==="ALL"?streams.length:streams.filter(i=>i.get("party_type")===f.key).length}
              </span>
            </button>
          ))}
          <span className="ls-tab-info">{filtered.length} stream{filtered.length!==1?"s":""}</span>
        </div>

        {/* Grid */}
        <div className="ls-grid-wrap">
          {pageItems.length===0 ? (
            <div className="ls-empty">
              <div className="ls-empty-icon">📡</div>
              <p>No live streams right now</p>
              <small>Try a different filter or check back soon</small>
            </div>
          ) : (
            <div className="ls-grid">
              {pageItems.map((item, idx)=>{
                const name     = item.get("username")         || "Anonymous";
                const img      = imgUrl(item.get("image"));
                const type     = item.get("party_type")       || "audio";
                const viewers  = (item.get("joined_users")||[]).length;
                const title    = item.get("audio_room_title") || item.get("title") || name+"'s Stream";
                const diamonds = item.get("streaming_diamonds") || 0;
                const col      = tc(type);

                return (
                  <div key={item.id} className="ls-card" style={{animationDelay:`${idx*35}ms`}}>

                    {/* Thumbnail */}
                    <div className="ls-card-thumb" onClick={()=>joinStream(item)}>
                      {img
                        ? <img src={img} alt={name} className="ls-card-img"/>
                        : <div className="ls-card-ph"><span>{icon(type)}</span></div>
                      }
                      <div className="ls-card-overlay"/>
                      <span className="ls-live-pill">● LIVE</span>
                      <span className="ls-type-pill"
                        style={{background:col.bg,borderColor:col.bd,color:col.tx}}>
                        {icon(type)} {type}
                      </span>
                      <div className="ls-vpill">👁 {viewers}</div>
                      {diamonds>0 && <div className="ls-dpill">💎 {diamonds.toLocaleString()}</div>}
                    </div>

                    {/* Body */}
                    <div className="ls-card-body">
                      <div className="ls-card-top">
                        <div className="ls-av">{ini(name)}</div>
                        <div>
                          <p className="ls-card-name">{name}</p>
                          <p className="ls-card-time">{hhmm(item.createdAt)}</p>
                        </div>
                      </div>
                      <p className="ls-card-title" title={title}>{title}</p>
                      <div className="ls-card-foot">
                        <button className="ls-watch-btn"
                          onClick={()=>joinStream(item)} disabled={joining}>
                          {joining ? <span className="ls-spin"/> : type==="audio"?"♬ Listen":"▶ Watch"}
                        </button>
                        <button className="ls-cut-btn" onClick={()=>setCutModal(item)}>⊘ Cut</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages>1 && (
            <div className="ls-pages">
              <button className="ls-pg" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({length:totalPages},(_,i)=>(
                <button key={i} className={`ls-pg ${page===i?"on":""}`} onClick={()=>setPage(i)}>{i+1}</button>
              ))}
              <button className="ls-pg" disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      </div>

      {/* ════════ VIEWER OVERLAY ════════ */}
      {viewer && (
        <div className="ls-viewer">

          {/* Viewer nav */}
          <div className="ls-vnav">
            <div className="ls-vnav-left">
              <button className="ls-back" onClick={leave}>← Back</button>
              <div className="ls-vhost">
                <span className="ls-vpulse"/>
                <div className="ls-vav">{ini(viewer.get("username")||"?")}</div>
                <div>
                  <p className="ls-vname">{viewer.get("username")||"Live Stream"}</p>
                  <p className="ls-vmeta">
                    {viewer.get("party_type")} · {(viewer.get("joined_users")||[]).length} in room
                  </p>
                </div>
              </div>
            </div>
            <div className="ls-vnav-right">
              <span className="ls-vct">👁 {vCount+remoteUsers.length}</span>
              <button className="ls-cut-nav" onClick={()=>setCutModal(viewer)}>⊘ Cut</button>
              <button className="ls-leave" onClick={leave}>Leave ✕</button>
            </div>
          </div>

          {/* Viewer body */}
          <div className="ls-vbody">

            {/* Video column */}
            <div className="ls-vcol">

              {/* Video stage */}
              <div className="ls-vstage">
                <div id="lv-video-player" className="ls-vinner">
                  {!remoteUsers.some(u=>u.videoTrack) && (
                    <div className="ls-novideo">
                      <div className="ls-novideo-icon">{icon(viewer.get("party_type"))}</div>
                      <p>Waiting for host…</p>
                      <small>Stream will appear here</small>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-user thumbnails */}
              {remoteUsers.length>1 && (
                <div className="ls-strip">
                  {remoteUsers.map(u=>(
                    <div key={u.uid}
                      className={`ls-strip-item ${spotUid===u.uid?"on":""}`}
                      onClick={()=>setSpotUid(u.uid)}>
                      <div className="ls-strip-icon">{u.videoTrack?"📷":"♬"}</div>
                      <span className="ls-strip-lbl">…{String(u.uid).slice(-4)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="ls-ctrls">
                <button className={`ls-ctrl ${muted?"on":""}`} onClick={toggleMute}>
                  <span>{muted?"🔇":"🔊"}</span>
                  <small>{muted?"Unmute":"Mute"}</small>
                </button>
                <button className="ls-ctrl" onClick={()=>{
                  navigator.clipboard?.writeText(window.location.href);
                  toast$("Link copied!","success");
                }}>
                  <span>🔗</span><small>Share</small>
                </button>
                <button className="ls-ctrl ls-ctrl--red" onClick={leave}>
                  <span>📞</span><small>Leave</small>
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="ls-sidebar">

              {/* Sidebar tabs */}
              <div className="ls-stabs">
                <button className={`ls-stab ${tab==="comments"?"on":""}`}
                  onClick={()=>setTab("comments")}>
                  💬 Comments
                  {comments.length>0 && <span className="ls-cbadge">{comments.length}</span>}
                </button>
                <button className={`ls-stab ${tab==="info"?"on":""}`}
                  onClick={()=>setTab("info")}>
                  ℹ Info
                </button>
              </div>

              {/* Comments tab */}
              {tab==="comments" && (
                <div className="ls-cmt-wrap">
                  {cmtLoading && comments.length===0 ? (
                    <div className="ls-cmt-load"><span className="ls-spin"/>Loading…</div>
                  ) : comments.length===0 ? (
                    <div className="ls-cmt-empty"><span>💬</span><p>No comments yet</p></div>
                  ) : (
                    <div className="ls-cmt-list">
                      {comments.map(c=>(
                        <div key={c.id} className={`ls-cmt ${c.msg==="Joined the Room"?"ls-cmt--join":""}`}>
                          <div className="ls-cmt-av-wrap">
                            {c.image
                              ? <img src={c.image} alt={c.name} className="ls-cmt-av"/>
                              : <div className="ls-cmt-av ls-cmt-av--ini">{ini(c.name)}</div>
                            }
                            {c.level>0 && <span className="ls-cmt-lv">Lv{c.level}</span>}
                          </div>
                          <div className="ls-cmt-body">
                            <div className="ls-cmt-row">
                              <span className="ls-cmt-name">{c.name}</span>
                              <span className="ls-cmt-time">{ago(c.at)}</span>
                            </div>
                            <p className="ls-cmt-msg">{c.msg}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEnd}/>
                    </div>
                  )}
                </div>
              )}

              {/* Info tab */}
              {tab==="info" && (
                <div className="ls-info-wrap">
                  <div className="ls-info-sec">
                    <p className="ls-info-lbl">Stream Info</p>
                    {[
                      ["Channel",  viewer.get("streaming_channel")||"—"],
                      ["Type",     viewer.get("party_type")||"—"],
                      ["Title",    viewer.get("audio_room_title")||viewer.get("title")||"—"],
                      ["Host",     viewer.get("username")||"—"],
                      ["Diamonds", (viewer.get("streaming_diamonds")||0).toLocaleString()+" 💎"],
                      ["In Room",  (viewer.get("joined_users")||[]).length],
                      ["Started",  hhmm(viewer.createdAt)],
                    ].map(([k,v],i)=>(
                      <div key={i} className="ls-info-row">
                        <span className="ls-info-k">{k}</span>
                        <span className="ls-info-v">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* People in room */}
                  <div className="ls-info-sec">
                    <p className="ls-info-lbl">People in Room</p>
                    {(viewer.get("joined_users")||[]).map((u,i)=>(
                      <div key={i} className="ls-person">
                        {u.image
                          ? <img src={u.image} alt={u.name} className="ls-person-av"/>
                          : <div className="ls-person-av ls-person-av--ini">{ini(u.name)}</div>
                        }
                        <div className="ls-person-info">
                          <span className="ls-person-name">{u.name}</span>
                          <span className="ls-person-uid">uid: {u.uid}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </aside>
          </div>
        </div>
      )}

      {/* Joining overlay */}
      {joining && !clientRef.current && (
        <div className="ls-overlay ls-overlay--load">
          <div className="ls-load-card">
            <div className="ls-spinner"/>
            <p>Joining stream…</p>
          </div>
        </div>
      )}
    </div>
  );
}