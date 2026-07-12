import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import Parse from "../../parseConfig";
import { Room, RoomEvent } from "livekit-client";

const StreamingContext = createContext(null);

export function useStreaming() {
  return useContext(StreamingContext);
}

// ── helpers ──
function ini(n = "") {
  return (n || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}
function imgUrl(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v.url === "function") return v.url();
  if (v.url) return v.url;
  return "";
}
function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n || 0);
}

export function StreamingProvider({ children }) {
  const [viewer, setViewer] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [vCount, setVCount] = useState(0);
  const [miniPos, setMiniPos] = useState({ x: null, y: null });

  const clientRef = useRef(null);
  const uidRef = useRef(Math.floor(Math.random() * 900000) + 100000);
  const mutedRef = useRef(false);
  const minimizedRef = useRef(false);
  const remoteUsersRef = useRef([]);
  const cmtTimer = useRef(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { minimizedRef.current = minimized; }, [minimized]);
  useEffect(() => { remoteUsersRef.current = remoteUsers; }, [remoteUsers]);

  const leaveInternal = useCallback(async () => {
    clearInterval(cmtTimer.current);
    try {
      if (clientRef.current && clientRef.current instanceof Room) {
        clientRef.current.disconnect();
      }
    } catch (e) {
      console.error("Leave error:", e);
    }
    clientRef.current = null;
  }, []);

  const leave = useCallback(async () => {
    await leaveInternal();
    setRemoteUsers([]);
    setViewer(null);
    setVCount(0);
    setJoining(false);
    setMuted(false);
    setMinimized(false);
    setMiniPos({ x: null, y: null });
    mutedRef.current = false;
  }, [leaveInternal]);

  const joinStream = useCallback(
    async (item, onToast) => {
      if (joining) return;

      if (viewer && minimized) {
        await leaveInternal();
        setRemoteUsers([]);
        setViewer(null);
        setVCount(0);
        setMuted(false);
        setMinimized(false);
        mutedRef.current = false;
        await new Promise((r) => setTimeout(r, 100));
      }

      setJoining(true);
      setViewer(item);
      setMinimized(false);

      const channel = item.get("streaming_channel");
      const uid = uidRef.current;

      try {
        // 1️⃣ Load Gravix credentials from AppSettings
        const settingsQuery = new Parse.Query("AppSettings");
        const settings = await settingsQuery.first({ useMasterKey: true });
        // Use the field names exactly as they appear in your AppSettings
        const apiKey = settings?.get("GravixApiKey") || settings?.get("gravixApiKey");
        const apiSecret = settings?.get("GravixApiSecret") || settings?.get("gravixApiSecret");
        if (!apiKey || !apiSecret) {
          throw new Error("Gravix credentials not set in AppSettings");
        }

        // 2️⃣ Request token via Vite proxy – NO CORS!
        const payload = {
          api_key: apiKey,
          api_secret: apiSecret,
          room: channel,
          identity: String(uid),
          can_publish: false,
          name: "listener",
        };

        // const response = await fetch("/gravix-token", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(payload),
        // });
        // Use proxy in development, direct URL in production (after CORS is sorted)
const tokenUrl = import.meta.env.DEV 
  ? "/gravix-token" 
  : "https://token.gravixcloud.com/v1/token";

const response = await fetch(tokenUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Token request failed: ${response.status} ${errorText}`);
        }
        const gravixData = await response.json();
        const { token, url: serverUrl } = gravixData;

        // 3️⃣ Create LiveKit Room and connect
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        clientRef.current = room;

        room.on(RoomEvent.ParticipantConnected, () => {
          setVCount((c) => c + 1);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          setRemoteUsers((prev) => prev.filter((u) => u.identity !== participant.identity));
          setVCount((c) => Math.max(0, c - 1));
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          setRemoteUsers((prev) => {
            const exists = prev.find((u) => u.identity === participant.identity);
            if (exists) return prev;
            return [
              ...prev,
              {
                identity: participant.identity,
                name: participant.name || participant.identity,
                audioTrack: track.kind === "audio" ? track : null,
                videoTrack: track.kind === "video" ? track : null,
                participant: participant,
              },
            ];
          });

          if (track.kind === "video") {
            const elId = minimizedRef.current ? "lv-global-mini" : "lv-global-player";
            const container = document.getElementById(elId);
            if (container) {
              container.innerHTML = "";
              const videoEl = document.createElement("video");
              videoEl.srcObject = track.mediaStream;
              videoEl.autoplay = true;
              videoEl.muted = true;
              videoEl.style.width = "100%";
              videoEl.style.height = "100%";
              videoEl.style.objectFit = "cover";
              container.appendChild(videoEl);
            }
          }

          if (track.kind === "audio") {
            track.attach();
            if (mutedRef.current) {
              track.setEnabled(false);
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });

        await room.connect(serverUrl, token);

        setJoining(false);
        onToast?.("Joined stream via Gravix/LiveKit!", "success");
      } catch (err) {
        console.error(err);
        let errorMsg = err.message;
        if (err.message.includes("fetch") || err.message.includes("CORS")) {
          errorMsg = "CORS error: Please add your domain to GravixCloud's allowlist, or use a proxy.";
        }
        onToast?.("Join failed: " + errorMsg, "error");
        leave();
      }
    },
    [joining, viewer, minimized, leaveInternal, leave]
  );

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);

    if (clientRef.current instanceof Room) {
      const participants = clientRef.current.remoteParticipants;
      participants.forEach((p) => {
        p.audioTracks.forEach(({ track }) => {
          if (track) {
            track.setEnabled(!next);
          }
        });
      });
    }
  }, []);

  const value = {
    viewer,
    remoteUsers,
    joining,
    muted,
    minimized,
    vCount,
    miniPos,
    setViewer,
    setMinimized,
    setMiniPos,
    joinStream,
    leave,
    toggleMute,
    hasVideo: remoteUsers.some((u) => u.videoTrack),
  };

  return (
    <StreamingContext.Provider value={value}>
      {children}
      <GlobalMiniPlayer />
    </StreamingContext.Provider>
  );
}

/* ══════════════════════════════════════════════════
   GLOBAL MINI PLAYER – Floating window when minimized
   Fully draggable and responsive.
══════════════════════════════════════════════════ */
function GlobalMiniPlayer() {
  const {
    viewer,
    remoteUsers,
    muted,
    minimized,
    vCount,
    miniPos,
    setMiniPos,
    setMinimized,
    leave,
    toggleMute,
    hasVideo,
  } = useStreaming();

  const dragRef = useRef(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startPosEl = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const isMobile = window.innerWidth < 640;
  const defaultX = isMobile ? window.innerWidth - 200 : window.innerWidth - 340;
  const defaultY = isMobile ? window.innerHeight - 140 : window.innerHeight - 220;

  const currentX = miniPos.x ?? defaultX;
  const currentY = miniPos.y ?? defaultY;

  const onPointerDown = useCallback(
    (e) => {
      if (e.target.closest("button")) return;
      isDragging.current = true;
      hasMoved.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      startPosEl.current = { x: currentX, y: currentY };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [currentX, currentY]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
      const el = dragRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const newX = Math.max(0, Math.min(window.innerWidth - w, startPosEl.current.x + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - h, startPosEl.current.y + dy));
      setMiniPos({ x: newX, y: newY });
    },
    [setMiniPos]
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!viewer || !minimized) return null;

  const hostImg = imgUrl(viewer.get("image"));
  const hostName = viewer.get("username") || "Live Stream";
  const pType = viewer.get("party_type") || "audio";

  const w = isMobile ? 180 : 280;
  const h = isMobile ? 120 : 180;

  return (
    <div
      ref={dragRef}
      style={{
        position: "fixed",
        left: currentX,
        top: currentY,
        width: w,
        zIndex: 99999,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)",
        background: "#0b0e1a",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        animation: "miniIn .3s cubic-bezier(.22,1,.36,1)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <style>{`@keyframes miniIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}`}</style>

      <div
        style={{
          position: "absolute",
          top: 6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 32,
          height: 3,
          borderRadius: 2,
          background: "rgba(255,255,255,0.2)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <div
        id="lv-global-mini"
        style={{
          width: "100%",
          height: h,
          background: "#0b0e1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!hasVideo && (
          <>
            {hostImg ? (
              <img
                src={hostImg}
                alt={hostName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(2px) brightness(.5)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg,#1e1b4b,#0f172a)",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              {hostImg ? (
                <img
                  src={hostImg}
                  alt={hostName}
                  style={{
                    width: isMobile ? 40 : 56,
                    height: isMobile ? 40 : 56,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: isMobile ? 40 : 56,
                    height: isMobile ? 40 : 56,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: isMobile ? 16 : 22,
                  }}
                >
                  {ini(hostName)}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  alignItems: "flex-end",
                  height: isMobile ? 16 : 20,
                }}
              >
                {[1, 0.5, 0.8, 0.4, 0.9, 0.6, 1].map((h2, i) => (
                  <div
                    key={i}
                    style={{
                      width: isMobile ? 2 : 3,
                      borderRadius: 2,
                      background: "rgba(167,139,250,0.8)",
                      animation: `wave .9s ease-in-out ${i * 0.12}s infinite alternate`,
                      height: `${h2 * (isMobile ? 14 : 18)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: 20,
            background: "rgba(239,68,68,0.85)",
            fontSize: 9,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#fff",
              animation: "pulse 1.2s infinite",
            }}
          />
          LIVE
        </div>
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "2px 7px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.5)",
            fontSize: 9,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {pType === "video" ? "▶" : pType === "audio" ? "♬" : "⊞"} {pType}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "6px 8px" : "8px 12px",
          background: "rgba(0,0,0,0.4)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ef4444",
              animation: "pulse 1.4s infinite",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? 9 : 11,
                fontWeight: 700,
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {hostName}
            </div>
            <div style={{ fontSize: isMobile ? 8 : 10, color: "rgba(255,255,255,0.4)" }}>
              👁 {vCount + remoteUsers.length}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
            style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: muted ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)",
              color: "#fff",
              cursor: "pointer",
              fontSize: isMobile ? 10 : 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .15s",
            }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setMinimized(false)}
            title="Expand"
            style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              cursor: "pointer",
              fontSize: isMobile ? 10 : 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .15s",
            }}
          >
            ⤢
          </button>
          <button
            onClick={leave}
            title="Leave stream"
            style={{
              width: isMobile ? 24 : 28,
              height: isMobile ? 24 : 28,
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              cursor: "pointer",
              fontSize: isMobile ? 10 : 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .15s",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wave  {from{transform:scaleY(.3)}to{transform:scaleY(1)}}
        @keyframes pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
      `}</style>
    </div>
  );
}