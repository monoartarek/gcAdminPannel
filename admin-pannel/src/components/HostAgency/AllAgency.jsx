import React, { useEffect, useState, useCallback } from "react";
import Parse from "../../parseConfig";
import "./AllAgency.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight, faUsers, faCoins, faClock,
  faChevronDown, faChevronUp,
} from "@fortawesome/free-solid-svg-icons";

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
function fmtNum(n) {
  const num = Number(n);
  if (!num || isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}
function fmtDur(mins) {
  const m = Number(mins);
  if (!m || isNaN(m)) return "0m";
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}
function getAvatarColor(str) {
  const p = ["#6366f1","#f472b6","#34d399","#fbbf24","#f87171","#60a5fa","#a78bfa","#22d3ee"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
}
function getInitial(str) { return (str || "?").charAt(0).toUpperCase(); }

/* ════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════ */
export default function AllAgency() {
  const [agencies,    setAgencies]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [animated,    setAnimated]    = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [expandedId,  setExpandedId]  = useState(null);
  const [sortBy,      setSortBy]      = useState("total");

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── fetch & group by agent_id ── */
  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    setAnimated(false);
    try {
      const AgencyMember = Parse.Object.extend("AgencyMember");
      let all = [], skip = 0;
      while (true) {
        const q = new Parse.Query(AgencyMember);
        q.limit(1000); q.skip(skip);
        q.select([
          "agent_id", "admin_id", "host_id",
          "audio_earning", "livestreaming_earning",
          "live_earnings", "match_earnings", "party_earnings",
          "game_gratuities", "multiboard_earning",
          "platform_reward", "p_coin_earnings",
          "total_points_earnings",
          "audio_duration", "audio_duration_minute",
          "livestream_duration", "livestream_duration_minute",
        ]);
        const batch = await q.find({ useMasterKey: true });
        if (!batch.length) break;
        all = [...all, ...batch];
        if (batch.length < 1000) break;
        skip += 1000;
      }

      /* group */
      const map = {};
      all.forEach(r => {
        const aid = r.get("agent_id") || "Unknown";
        if (!map[aid]) {
          map[aid] = {
            agent_id:             aid,
            admin_id:             r.get("admin_id") || "—",
            members:              0,
            host_ids:             [],
            audio_earning:        0,
            livestreaming_earning:0,
            other_earning:        0,
            total_earnings:       0,
            total_points:         0,
            audio_dur:            0,
            audio_dur_min:        0,
            livestream_dur:       0,
            livestream_dur_min:   0,
          };
        }
        const ag = map[aid];
        ag.members++;
        const hid = r.get("host_id");
        if (hid && !ag.host_ids.includes(hid)) ag.host_ids.push(hid);

        const ae = Number(r.get("audio_earning")         || 0);
        const le = Number(r.get("livestreaming_earning")  || 0);
        const oe = ["live_earnings","match_earnings","party_earnings",
                    "game_gratuities","multiboard_earning","platform_reward",
                    "p_coin_earnings"]
                   .reduce((s, f) => s + Number(r.get(f) || 0), 0);

        ag.audio_earning         += ae;
        ag.livestreaming_earning += le;
        ag.other_earning         += oe;
        ag.total_earnings        += ae + le + oe;
        ag.total_points          += Number(r.get("total_points_earnings")       || 0);
        ag.audio_dur             += Number(r.get("audio_duration")              || 0);
        ag.audio_dur_min         += Number(r.get("audio_duration_minute")       || 0);
        ag.livestream_dur        += Number(r.get("livestream_duration")         || 0);
        ag.livestream_dur_min    += Number(r.get("livestream_duration_minute")  || 0);
      });

      setAgencies(Object.values(map));
    } catch (err) {
      showToast("Fetch failed: " + err.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimated(true), 80);
    }
  }, [showToast]);

  useEffect(() => { fetchAgencies(); }, [fetchAgencies]);

  /* sort + filter */
  const processed = [...agencies]
    .sort((a, b) => {
      if (sortBy === "members")    return b.members - a.members;
      if (sortBy === "audio")      return b.audio_earning - a.audio_earning;
      if (sortBy === "livestream") return b.livestreaming_earning - a.livestreaming_earning;
      return b.total_earnings - a.total_earnings;
    })
    .filter(ag => {
      const q = searchInput.toLowerCase();
      return !q || ag.agent_id.toLowerCase().includes(q) || ag.admin_id.toLowerCase().includes(q);
    });

  const maxEarn = processed.length > 0 ? processed[0].total_earnings : 1;

  const totalMembers  = agencies.reduce((s, a) => s + a.members, 0);
  const totalEarnings = agencies.reduce((s, a) => s + a.total_earnings, 0);
  const totalAudio    = agencies.reduce((s, a) => s + a.audio_earning, 0);
  const totalStream   = agencies.reduce((s, a) => s + a.livestreaming_earning, 0);

  /* ════════════ RENDER ════════════ */
  return (
    <div className="ag-root">

      {/* Toast */}
      {toast && (
        <div className={`ag-toast ag-toast--${toast.type}`}>
          <span className="ag-toast-dot" />{toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="ag-header">
        <div className="ag-header-left">
          <span className="ag-eyebrow">Agency Management</span>
          <h1 className="ag-title">All Agencies</h1>
          <span className="ag-subtitle">
            {loading ? "Loading…"
              : `${processed.length} agencies · ${totalMembers.toLocaleString()} total members`}
          </span>
        </div>
        <button className="ag-refresh-btn" onClick={fetchAgencies} disabled={loading}
          title="Refresh">
          {loading ? <span className="ag-spin" /> : <FontAwesomeIcon icon={faRotateRight} />}
        </button>
      </div>

      {/* ── Summary stat cards ── */}
      {!loading && (
        <div className="ag-stat-row">
          {[
            { label: "Agencies",       val: agencies.length,          color: "#818cf8", icon: "◈" },
            { label: "Total Members",  val: totalMembers.toLocaleString(), color: "#60a5fa", icon: "◉" },
            { label: "Total Earnings", val: fmtNum(totalEarnings),    color: "#fbbf24", icon: "◎" },
            { label: "Audio Earnings", val: fmtNum(totalAudio),       color: "#34d399", icon: "⬡" },
            { label: "Stream Earnings",val: fmtNum(totalStream),      color: "#5b8af5", icon: "⊞" },
          ].map((s, i) => (
            <div key={i} className="ag-stat-card" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="ag-stat-icon">{s.icon}</span>
              <div className="ag-stat-body">
                <span className="ag-stat-val" style={{ color: s.color }}>{s.val}</span>
                <span className="ag-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="ag-toolbar">
        <div className="ag-search-wrap">
          <span className="ag-search-icon">⌕</span>
          <input className="ag-search"
            placeholder="Search by agent ID or admin ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchInput && (
            <button className="ag-search-clear" onClick={() => setSearchInput("")}>✕</button>
          )}
        </div>
        <div className="ag-sort-group">
          <span className="ag-sort-label">Sort:</span>
          {[
            { key: "total",      label: "Total Earn"  },
            { key: "audio",      label: "Audio"       },
            { key: "livestream", label: "Livestream"  },
            { key: "members",    label: "Members"     },
          ].map(s => (
            <button key={s.key}
              className={`ag-sort-btn ${sortBy === s.key ? "on" : ""}`}
              onClick={() => setSortBy(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        {!loading && <span className="ag-result-count">{processed.length} result{processed.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="ag-loading">
          <div className="ag-loading-ring" />
          <div className="ag-loading-ring ag-loading-ring--2" />
          <p>Grouping agency data…</p>
        </div>
      ) : processed.length === 0 ? (
        <div className="ag-empty">
          <div className="ag-empty-icon">◎</div>
          <p>No agencies found</p>
          <button className="ag-empty-reset" onClick={() => setSearchInput("")}>Clear search</button>
        </div>
      ) : (
        <div className={`ag-list ${animated ? "in" : ""}`}>

          {/* ── List header ── */}
          <div className="ag-list-head">
            <span className="ag-lh" style={{ width: 52 }} />
            <span className="ag-lh ag-lh--grow">Agent ID</span>
            <span className="ag-lh ag-lh--hide-sm">Admin ID</span>
            <span className="ag-lh ag-lh--num">Members</span>
            <span className="ag-lh ag-lh--num ag-lh--hide-md">Audio Earn</span>
            <span className="ag-lh ag-lh--num ag-lh--hide-md">Livestream</span>
            <span className="ag-lh ag-lh--num">Total Earn</span>
            <span className="ag-lh ag-lh--num ag-lh--hide-lg">Audio Dur</span>
            <span className="ag-lh ag-lh--num ag-lh--hide-lg">Stream Dur</span>
            <span className="ag-lh" style={{ width: 40 }} />
          </div>

          {processed.map((ag, i) => {
            const color    = getAvatarColor(ag.agent_id);
            const barPct   = maxEarn > 0 ? (ag.total_earnings / maxEarn) * 100 : 0;
            const isExpand = expandedId === ag.agent_id;

            return (
              <div key={ag.agent_id} className={`ag-agency-block ${animated ? "in" : ""}`}
                style={{ animationDelay: `${i * 32}ms` }}>

                {/* ── Main row ── */}
                <div className={`ag-row ${isExpand ? "ag-row--open" : ""}`}
                  onClick={() => setExpandedId(isExpand ? null : ag.agent_id)}>

                  {/* Rank + Avatar */}
                  <div className="ag-av-cell">
                    <span className="ag-rank">{i + 1}</span>
                    <div className="ag-av" style={{ background: color }}>
                      {getInitial(ag.agent_id)}
                    </div>
                  </div>

                  {/* Agent ID + bar */}
                  <div className="ag-cell ag-cell--grow">
                    <span className="ag-agent-id ag-copyable"
                      onClick={e => { e.stopPropagation(); copyToClipboard(ag.agent_id, showToast); }}
                      title="Click to copy Agent ID">
                      {ag.agent_id}
                    </span>
                    <div className="ag-earn-bar-track">
                      <div className="ag-earn-bar-fill" style={{
                        width: animated ? `${Math.max(barPct, 1)}%` : "0%",
                        background: color,
                        boxShadow: `0 0 6px ${color}66`,
                        transitionDelay: `${i * 32}ms`,
                      }} />
                    </div>
                  </div>

                  {/* Admin ID */}
                  <div className="ag-cell ag-cell--hide-sm">
                    <span className="ag-admin-id ag-copyable"
                      onClick={e => { e.stopPropagation(); copyToClipboard(ag.admin_id, showToast); }}
                      title="Click to copy Admin ID">
                      {ag.admin_id}
                    </span>
                  </div>

                  {/* Members */}
                  <div className="ag-cell ag-cell--num">
                    <span className="ag-badge-members">
                      <FontAwesomeIcon icon={faUsers} /> {ag.members}
                    </span>
                  </div>

                  {/* Audio earn */}
                  <div className="ag-cell ag-cell--num ag-cell--hide-md">
                    <span className="ag-val ag-val--audio">{fmtNum(ag.audio_earning)}</span>
                  </div>

                  {/* Livestream earn */}
                  <div className="ag-cell ag-cell--num ag-cell--hide-md">
                    <span className="ag-val ag-val--live">{fmtNum(ag.livestreaming_earning)}</span>
                  </div>

                  {/* Total earn */}
                  <div className="ag-cell ag-cell--num">
                    <span className="ag-val ag-val--total">{fmtNum(ag.total_earnings)}</span>
                  </div>

                  {/* Audio dur */}
                  <div className="ag-cell ag-cell--num ag-cell--hide-lg">
                    <span className="ag-val ag-val--dur">{fmtDur(ag.audio_dur_min)}</span>
                  </div>

                  {/* Stream dur */}
                  <div className="ag-cell ag-cell--num ag-cell--hide-lg">
                    <span className="ag-val ag-val--dur">{fmtDur(ag.livestream_dur_min)}</span>
                  </div>

                  {/* Expand */}
                  <div className="ag-cell ag-cell--expand">
                    <FontAwesomeIcon icon={isExpand ? faChevronUp : faChevronDown} />
                  </div>
                </div>

                {/* ── Expanded panel ── */}
                {isExpand && (
                  <div className="ag-detail">
                    <div className="ag-detail-grid">

                      {/* Earnings */}
                      <div className="ag-detail-section">
                        <div className="ag-detail-title">
                          <FontAwesomeIcon icon={faCoins} /> Earnings
                        </div>
                        <div className="ag-detail-cells">
                          {[
                            { label: "Audio",       val: fmtNum(ag.audio_earning),          color: "#34d399" },
                            { label: "Livestream",  val: fmtNum(ag.livestreaming_earning),  color: "#5b8af5" },
                            { label: "Other",       val: fmtNum(ag.other_earning),          color: "#a78bfa" },
                            { label: "Total Pts",   val: fmtNum(ag.total_points),           color: "#fbbf24" },
                            { label: "Grand Total", val: fmtNum(ag.total_earnings),         color: "#f472b6" },
                          ].map(e => (
                            <div key={e.label} className="ag-dc">
                              <span className="ag-dc-label">{e.label}</span>
                              <span className="ag-dc-val" style={{ color: e.color }}>{e.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Durations */}
                      <div className="ag-detail-section">
                        <div className="ag-detail-title">
                          <FontAwesomeIcon icon={faClock} /> Durations
                        </div>
                        <div className="ag-detail-cells">
                          {[
                            { label: "Audio (hr)",    val: fmtDur(ag.audio_dur),          color: "#34d399" },
                            { label: "Audio (min)",   val: fmtDur(ag.audio_dur_min),       color: "#2dd4bf" },
                            { label: "Stream (hr)",   val: fmtDur(ag.livestream_dur),      color: "#5b8af5" },
                            { label: "Stream (min)",  val: fmtDur(ag.livestream_dur_min),  color: "#60a5fa" },
                          ].map(e => (
                            <div key={e.label} className="ag-dc">
                              <span className="ag-dc-label">{e.label}</span>
                              <span className="ag-dc-val" style={{ color: e.color }}>{e.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Host members */}
                      <div className="ag-detail-section ag-detail-section--full">
                        <div className="ag-detail-title">
                          <FontAwesomeIcon icon={faUsers} /> Host Members ({ag.members})
                        </div>
                        <div className="ag-host-chips">
                          {ag.host_ids.slice(0, 15).map(hid => (
                            <span key={hid} className="ag-host-chip ag-copyable"
                              onClick={() => copyToClipboard(hid, showToast)}
                              title="Copy Host ID">
                              {hid}
                            </span>
                          ))}
                          {ag.host_ids.length > 15 && (
                            <span className="ag-host-chip ag-host-chip--more">
                              +{ag.host_ids.length - 15} more
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}