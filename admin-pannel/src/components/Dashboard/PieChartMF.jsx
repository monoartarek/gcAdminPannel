import React, { useEffect, useState } from "react";
import Parse from "../../parseConfig";
import "./PieChartMF.css";

/* ── Age Groups ── */
const AGE_GROUPS = [
  { label: "Under 18", min: 0,  max: 17  },
  { label: "18 – 24",  min: 18, max: 24  },
  { label: "25 – 34",  min: 25, max: 34  },
  { label: "35 – 44",  min: 35, max: 44  },
  { label: "45 – 54",  min: 45, max: 54  },
  { label: "55+",      min: 55, max: 999 },
];

const AGE_COLORS = [
  "#a78bfa", "#60a5fa", "#34d399",
  "#fbbf24", "#f87171", "#f472b6",
];

const COUNTRY_COLORS = [
  "#6366f1","#06b6d4","#10b981",
  "#f59e0b","#f43f5e","#8b5cf6",
  "#ec4899","#14b8a6",
];

/* ── Helpers ── */
function calcAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ── Last 6 months date ranges ── */
function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleString("default", { month: "short" });
    months.push({ label, start, end });
  }
  return months;
}

/* ── SVG Donut Math ── */
const CX = 110, CY = 110, R = 90, IR = 58;

function polar(angle, radius) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function arcPath(a1, a2, ro, ri) {
  if (Math.abs(a2 - a1) >= 360) a2 = a1 + 359.99;
  const s  = polar(a1, ro), e  = polar(a2, ro);
  const si = polar(a1, ri), ei = polar(a2, ri);
  const lg = a2 - a1 > 180 ? 1 : 0;
  return [
    `M ${s.x} ${s.y}`,
    `A ${ro} ${ro} 0 ${lg} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${ri} ${ri} 0 ${lg} 0 ${si.x} ${si.y}`,
    "Z",
  ].join(" ");
}

/* ════════════════════════════════════════════════════════
   GROWTH POLYGON COMPONENT
════════════════════════════════════════════════════════ */
function GrowthPolygon({ userGrowth, streamGrowth, coinGrowth, animated }) {
  const [activeMetric, setActiveMetric] = useState("users");
  const [tooltip,      setTooltip]      = useState(null);

  const dataMap = {
    users:   { data: userGrowth,   color: "#5b8af5", label: "Users",   key: "count", icon: "◈" },
    streams: { data: streamGrowth, color: "#34d399", label: "Streams", key: "count", icon: "⬡" },
    coins:   { data: coinGrowth,   color: "#fbbf24", label: "Coins",   key: "total", icon: "◎" },
  };

  const active     = dataMap[activeMetric];
  const values     = active.data.map(d => d[active.key] || 0);
  const labels     = active.data.map(d => d.label);
  const maxVal     = Math.max(...values, 1);
  const totalVal   = values.reduce((a, b) => a + b, 0);
  const latestVal  = values[values.length - 1] || 0;
  const prevVal    = values[values.length - 2]  || 0;
  const growthPct  = prevVal === 0 ? 100 : (((latestVal - prevVal) / prevVal) * 100);
  const isPositive = growthPct >= 0;

  /* SVG dimensions */
  const W = 340, H = 160, PL = 38, PR = 12, PT = 18, PB = 28;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;

  const pts = values.map((v, i) => ({
    x: PL + (values.length < 2 ? plotW / 2 : (i / (values.length - 1)) * plotW),
    y: PT + plotH - (v / maxVal) * plotH,
    v,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = pts.length > 0
    ? `M ${pts[0].x},${PT + plotH} `
      + pts.map(p => `L ${p.x},${p.y}`).join(" ")
      + ` L ${pts[pts.length - 1].x},${PT + plotH} Z`
    : "";

  return (
    <div className="pmc-card pmc-card--growth">
      {/* Header */}
      <div className="pmc-card-header">
        <div className="pmc-card-title-group">
          <span className="pmc-card-eyebrow">6-Month Trend</span>
          <h2 className="pmc-card-title">App Growth</h2>
        </div>
        <div className="pmc-tab-pills">
          {Object.entries(dataMap).map(([key, val]) => (
            <button
              key={key}
              className={`pmc-tab-pill ${activeMetric === key ? "is-active" : ""}`}
              onClick={() => setActiveMetric(key)}
              style={activeMetric === key
                ? { color: val.color, borderColor: `${val.color}55`, background: `${val.color}12` }
                : {}}
            >
              {val.icon} {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="pmc-growth-kpis">
        <div className="pmc-growth-kpi">
          <span className="pmc-growth-kpi-label">6-Month Total</span>
          <span className="pmc-growth-kpi-val" style={{ color: active.color }}>
            {formatNumber(totalVal)}
          </span>
        </div>
        <div className="pmc-growth-kpi">
          <span className="pmc-growth-kpi-label">This Month</span>
          <span className="pmc-growth-kpi-val" style={{ color: active.color }}>
            {formatNumber(latestVal)}
          </span>
        </div>
        <div className="pmc-growth-kpi">
          <span className="pmc-growth-kpi-label">vs Last Month</span>
          <span
            className="pmc-growth-kpi-val"
            style={{ color: isPositive ? "#34d399" : "#f87171" }}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(growthPct).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Polygon SVG */}
      {active.data.length === 0 ? (
        <div className="pmc-empty">No data yet</div>
      ) : (
        <>
          <div className="pmc-growth-svg-wrap" onMouseLeave={() => setTooltip(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="pmc-growth-svg">
              <defs>
                <linearGradient id={`pg-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={active.color} stopOpacity="0.38" />
                  <stop offset="100%" stopColor={active.color} stopOpacity="0.02" />
                </linearGradient>
                <filter id="pgGlow">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Grid */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = PT + plotH - pct * plotH;
                return (
                  <g key={i}>
                    <line x1={PL} y1={y} x2={PL + plotW} y2={y}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                      strokeDasharray={i === 0 ? "none" : "3,5"} />
                    <text x={PL - 4} y={y + 3.5} fontSize="8"
                      fill="rgba(255,255,255,0.2)" textAnchor="end"
                      fontFamily="DM Mono, monospace">
                      {formatNumber(Math.round(maxVal * pct))}
                    </text>
                  </g>
                );
              })}

              {/* Area */}
              <path d={areaPath} fill={`url(#pg-${activeMetric})`} />

              {/* Hover crosshair */}
              {tooltip !== null && pts[tooltip] && (
                <line
                  x1={pts[tooltip].x} y1={PT}
                  x2={pts[tooltip].x} y2={PT + plotH}
                  stroke={active.color} strokeWidth="1"
                  strokeDasharray="3,4" opacity="0.45"
                />
              )}

              {/* Polygon line */}
              <polyline
                points={polyline}
                fill="none"
                stroke={active.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#pgGlow)"
              />

              {/* Dots + labels + hover */}
              {pts.map((p, i) => (
                <g key={i}>
                  <rect
                    x={p.x - 22} y={PT} width={44} height={plotH + PB}
                    fill="transparent"
                    onMouseEnter={() => setTooltip(i)}
                  />
                  {/* X label */}
                  <text x={p.x} y={H - 3} fontSize="9"
                    fill="rgba(255,255,255,0.28)" textAnchor="middle"
                    fontFamily="DM Sans, sans-serif">
                    {labels[i]}
                  </text>
                  {/* Glow ring */}
                  <circle cx={p.x} cy={p.y} r="8"
                    fill={active.color} opacity={tooltip === i ? 0.18 : 0.08} />
                  {/* Dot */}
                  <circle cx={p.x} cy={p.y} r={tooltip === i ? 5 : 3.5}
                    fill={active.color} filter="url(#pgGlow)" />
                  {/* Tooltip */}
                  {tooltip === i && (
                    <g>
                      <rect x={p.x - 28} y={p.y - 32} width={56} height={20}
                        rx="5" fill={active.color} opacity="0.93" />
                      <text x={p.x} y={p.y - 18} fontSize="9.5"
                        fill="#fff" textAnchor="middle"
                        fontFamily="DM Mono, monospace" fontWeight="500">
                        {p.v.toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Bottom strip bars */}
          <div className="pmc-growth-strip">
            {values.map((v, i) => {
              const isMax = v === Math.max(...values);
              const hPct  = maxVal > 0 ? (v / maxVal) * 100 : 0;
              return (
                <div key={i} className="pmc-growth-strip-col">
                  <div className="pmc-growth-strip-bar-bg">
                    <div
                      className="pmc-growth-strip-bar"
                      style={{
                        height: animated ? `${Math.max(4, hPct)}%` : "0%",
                        background: isMax ? active.color : `${active.color}44`,
                        boxShadow: isMax ? `0 0 8px ${active.color}88` : "none",
                        transitionDelay: `${i * 65}ms`,
                      }}
                    />
                  </div>
                  <span className="pmc-growth-strip-label">{labels[i]}</span>
                  <span
                    className="pmc-growth-strip-val"
                    style={{ color: isMax ? active.color : "var(--pmc-muted)" }}
                  >
                    {formatNumber(v)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function PieChartMF() {
  const [male,         setMale]         = useState(0);
  const [female,       setFemale]       = useState(0);
  const [ageCounts,    setAgeCounts]    = useState(Array(AGE_GROUPS.length).fill(0));
  const [countries,    setCountries]    = useState([]);
  const [streamers,    setStreamers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [animated,     setAnimated]     = useState(false);
  const [hovered,      setHovered]      = useState(null);
  const [hoveredAge,   setHoveredAge]   = useState(null);
  const [hoveredCnt,   setHoveredCnt]   = useState(null);
  const [activeTab,    setActiveTab]    = useState("age");
  const [totalUsers,   setTotalUsers]   = useState(0);
  const [userGrowth,   setUserGrowth]   = useState([]);
  const [streamGrowth, setStreamGrowth] = useState([]);
  const [coinGrowth,   setCoinGrowth]   = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [ugData, sgData, cgData] = await Promise.all([
          fetchUsers(),
          fetchStreamers(),
          fetchUserGrowth(),
          fetchStreamGrowth(),
          fetchCoinGrowth(),
        ]).then(r => [r[2], r[3], r[4]]);
        setUserGrowth(ugData   || []);
        setStreamGrowth(sgData || []);
        setCoinGrowth(cgData   || []);
      } catch (err) {
        console.error("PieChartMF fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) setTimeout(() => setAnimated(true), 80);
  }, [loading]);

  /* ── Fetch: users ── */
  const fetchUsers = async () => {
    let allUsers = [], skip = 0;
    const limit  = 1000;
    while (true) {
      const q = new Parse.Query(Parse.User);
      q.select("gender", "birthday", "country");
      q.limit(limit);
      q.skip(skip);
      const batch = await q.find({ useMasterKey: true });
      allUsers = [...allUsers, ...batch];
      if (batch.length < limit) break;
      skip += limit;
    }
    let maleCount = 0, femaleCount = 0;
    const ageBuckets = Array(AGE_GROUPS.length).fill(0);
    const countryMap = {};
    allUsers.forEach(user => {
      const g = (user.get("gender") || "").toLowerCase();
      if (g === "male")   maleCount++;
      if (g === "female") femaleCount++;
      const age = calcAge(user.get("birthday"));
      if (age !== null) {
        for (let i = 0; i < AGE_GROUPS.length; i++) {
          if (age >= AGE_GROUPS[i].min && age <= AGE_GROUPS[i].max) { ageBuckets[i]++; break; }
        }
      }
      const c = (user.get("country") || "").trim();
      if (c) countryMap[c] = (countryMap[c] || 0) + 1;
    });
    const sortedCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name, count }));
    setMale(maleCount);
    setFemale(femaleCount);
    setAgeCounts(ageBuckets);
    setCountries(sortedCountries);
    setTotalUsers(allUsers.length);
  };

  /* ── Fetch: streamers ── */
  const fetchStreamers = async () => {
    try {
      const q = new Parse.Query("Streaming");
      q.descending("joined_users");
      q.limit(10);
      const res = await q.find();
      setStreamers(res);
    } catch (err) {
      console.error("Streamers fetch error:", err);
    }
  };

  /* ── Fetch: user growth (monthly) ── */
  const fetchUserGrowth = async () => {
    const months = getLast6Months();
    const results = [];
    for (const { label, start, end } of months) {
      try {
        const q = new Parse.Query(Parse.User);
        q.greaterThanOrEqualTo("createdAt", start);
        q.lessThan("createdAt", end);
        const count = await q.count({ useMasterKey: true });
        results.push({ label, count });
      } catch { results.push({ label, count: 0 }); }
    }
    return results;
  };

  /* ── Fetch: stream growth (monthly) ── */
  const fetchStreamGrowth = async () => {
    const months = getLast6Months();
    const results = [];
    for (const { label, start, end } of months) {
      try {
        const q = new Parse.Query("Streaming");
        q.greaterThanOrEqualTo("createdAt", start);
        q.lessThan("createdAt", end);
        const count = await q.count();
        results.push({ label, count });
      } catch { results.push({ label, count: 0 }); }
    }
    return results;
  };

  /* ── Fetch: coin growth (monthly) ──
     ⚠️  Replace "CoinTransaction" with your actual Parse class name
     ⚠️  Replace "amount" with your actual coin amount field          */
  const fetchCoinGrowth = async () => {
    const months = getLast6Months();
    const results = [];
    for (const { label, start, end } of months) {
      try {
        const q = new Parse.Query("CoinTransaction"); // ← your class
        q.greaterThanOrEqualTo("createdAt", start);
        q.lessThan("createdAt", end);
        const batch = await q.find({ useMasterKey: true });
        const total = batch.reduce((sum, obj) => sum + (obj.get("amount") || 0), 0); // ← your field
        results.push({ label, total });
      } catch { results.push({ label, total: 0 }); }
    }
    return results;
  };

  /* ── Donut math ── */
  const total         = male + female;
  const malePercent   = total === 0 ? 50 : (male   / total) * 100;
  const femalePercent = total === 0 ? 50 : (female / total) * 100;
  const maleAng       = (malePercent / 100) * 360;
  const malePath      = arcPath(0,       maleAng, R,     IR);
  const femalePath    = arcPath(maleAng, 360,     R,     IR);
  const maleHov       = arcPath(0,       maleAng, R + 8, IR - 5);
  const femaleHov     = arcPath(maleAng, 360,     R + 8, IR - 5);
  const maxAge        = Math.max(...ageCounts, 1);
  const maxCnt        = Math.max(...countries.map(c => c.count), 1);

  if (loading) {
    return (
      <div className="pmc-loading">
        <div className="pmc-loading-orb">
          <div className="pmc-loading-ring" />
          <div className="pmc-loading-ring pmc-loading-ring--2" />
        </div>
        <p className="pmc-loading-text">Pulling live data…</p>
      </div>
    );
  }

  return (
    <div className={`pmc-root ${animated ? "is-animated" : ""}`}>

      {/* ── Hero Stats ── */}
      <div className="pmc-hero-stats">
        {[
          { label: "Total Users",  value: formatNumber(totalUsers),       icon: "◈", color: "violet" },
          { label: "Live Streams", value: formatNumber(streamers.length), icon: "⬡", color: "cyan"   },
          { label: "Male Users",   value: formatNumber(male),             icon: "♂", color: "blue"   },
          { label: "Female Users", value: formatNumber(female),           icon: "♀", color: "pink"   },
        ].map((stat, i) => (
          <div key={stat.label} className={`pmc-stat-card pmc-stat-card--${stat.color}`}
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className="pmc-stat-icon">{stat.icon}</div>
            <div className="pmc-stat-value">{stat.value}</div>
            <div className="pmc-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── 3-Column Charts Row ── */}
      <div className="pmc-charts-row pmc-charts-row--3col">

        {/* Gender Donut */}
        <div className="pmc-card pmc-card--gender">
          <div className="pmc-card-header">
            <div className="pmc-card-title-group">
              <span className="pmc-card-eyebrow">Analytics</span>
              <h2 className="pmc-card-title">Gender Split</h2>
            </div>
            <div className="pmc-card-badge">{total.toLocaleString()} total</div>
          </div>
          <div className="pmc-donut-wrap">
            <svg viewBox="0 0 220 220" className="pmc-donut-svg">
              <defs>
                <filter id="glow-m"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="glow-f"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e2436" strokeWidth={R - IR} />
              {total > 0 && femalePercent > 0 && (
                <path d={hovered === "female" ? femaleHov : femalePath}
                  className="pmc-slice pmc-slice--f"
                  filter={hovered === "female" ? "url(#glow-f)" : ""}
                  onMouseEnter={() => setHovered("female")} onMouseLeave={() => setHovered(null)} />
              )}
              {total > 0 && malePercent > 0 && (
                <path d={hovered === "male" ? maleHov : malePath}
                  className="pmc-slice pmc-slice--m"
                  filter={hovered === "male" ? "url(#glow-m)" : ""}
                  onMouseEnter={() => setHovered("male")} onMouseLeave={() => setHovered(null)} />
              )}
              {total === 0 && <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e2436" strokeWidth={R - IR} />}
              <circle cx={CX} cy={CY} r={IR} className="pmc-hole" />
              <text x={CX} y={CY - 14} className="pmc-center-big">
                {hovered === "male" ? formatNumber(male) : hovered === "female" ? formatNumber(female) : formatNumber(total)}
              </text>
              <text x={CX} y={CY + 8} className="pmc-center-mid">
                {hovered === "male" ? "Male" : hovered === "female" ? "Female" : "Users"}
              </text>
              <text x={CX} y={CY + 26} className="pmc-center-pct">
                {hovered === "male" ? malePercent.toFixed(1) + "%" : hovered === "female" ? femalePercent.toFixed(1) + "%" : "Total"}
              </text>
            </svg>
            <div className="pmc-gender-legend">
              {[
                { key: "male",   label: "Male",   val: male,   pct: malePercent,   color: "#4f9cf9" },
                { key: "female", label: "Female", val: female, pct: femalePercent, color: "#f472b6" },
              ].map(({ key, label, val, pct, color }) => (
                <div key={key} className={`pmc-gender-row ${hovered === key ? "is-active" : ""}`}
                  onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}>
                  <div className="pmc-gender-bar-bg">
                    <div className="pmc-gender-bar-fill"
                      style={{ width: animated ? `${pct}%` : "0%", background: color, boxShadow: `0 0 12px ${color}55` }} />
                  </div>
                  <div className="pmc-gender-info">
                    <span className="pmc-gender-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="pmc-gender-label">{label}</span>
                    <span className="pmc-gender-count">{val.toLocaleString()}</span>
                    <span className="pmc-gender-pct" style={{ color }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age / Country Tabs */}
        <div className="pmc-card pmc-card--bars">
          <div className="pmc-card-header">
            <div className="pmc-card-title-group">
              <span className="pmc-card-eyebrow">Demographics</span>
              <h2 className="pmc-card-title">{activeTab === "age" ? "Age Groups" : "Top Countries"}</h2>
            </div>
            <div className="pmc-tab-pills">
              <button className={`pmc-tab-pill ${activeTab === "age" ? "is-active" : ""}`} onClick={() => setActiveTab("age")}>Age</button>
              <button className={`pmc-tab-pill ${activeTab === "country" ? "is-active" : ""}`} onClick={() => setActiveTab("country")}>Country</button>
            </div>
          </div>
          <div className="pmc-bars-list">
            {activeTab === "age"
              ? AGE_GROUPS.map((g, i) => {
                  const pct = (ageCounts[i] / maxAge) * 100;
                  return (
                    <div key={g.label} className={`pmc-bar-row ${hoveredAge === i ? "is-on" : ""}`}
                      onMouseEnter={() => setHoveredAge(i)} onMouseLeave={() => setHoveredAge(null)}>
                      <span className="pmc-bar-label">{g.label}</span>
                      <div className="pmc-bar-track">
                        <div className="pmc-bar-fill" style={{
                          width: animated ? `${pct}%` : "0%", background: AGE_COLORS[i],
                          boxShadow: hoveredAge === i ? `0 0 14px ${AGE_COLORS[i]}88` : "none",
                          transitionDelay: `${i * 60}ms`,
                        }} />
                        <span className="pmc-bar-inner-pct" style={{ color: AGE_COLORS[i] }}>{pct.toFixed(0)}%</span>
                      </div>
                      <span className="pmc-bar-count">{ageCounts[i].toLocaleString()}</span>
                    </div>
                  );
                })
              : countries.length === 0
              ? <p className="pmc-empty">No country data</p>
              : countries.map((c, i) => {
                  const pct = (c.count / maxCnt) * 100;
                  const clr = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
                  return (
                    <div key={c.name} className={`pmc-bar-row ${hoveredCnt === i ? "is-on" : ""}`}
                      onMouseEnter={() => setHoveredCnt(i)} onMouseLeave={() => setHoveredCnt(null)}>
                      <span className="pmc-bar-label">{c.name}</span>
                      <div className="pmc-bar-track">
                        <div className="pmc-bar-fill" style={{
                          width: animated ? `${pct}%` : "0%", background: clr,
                          boxShadow: hoveredCnt === i ? `0 0 14px ${clr}88` : "none",
                          transitionDelay: `${i * 60}ms`,
                        }} />
                        <span className="pmc-bar-inner-pct" style={{ color: clr }}>{pct.toFixed(0)}%</span>
                      </div>
                      <span className="pmc-bar-count">{c.count.toLocaleString()}</span>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Growth Polygon — right of age chart */}
        <GrowthPolygon
          userGrowth={userGrowth}
          streamGrowth={streamGrowth}
          coinGrowth={coinGrowth}
          animated={animated}
        />

      </div>

      {/* ── Top Streamers ── */}
      <div className="pmc-card pmc-card--streamers">
        <div className="pmc-card-header">
          <div className="pmc-card-title-group">
            <span className="pmc-card-eyebrow">Live Now</span>
            <h2 className="pmc-card-title">Top Streamers</h2>
          </div>
          <div className="pmc-live-badge">
            <span className="pmc-live-dot" />{streamers.length} Live
          </div>
        </div>
        {streamers.length === 0 ? (
          <div className="pmc-empty-streamers">
            <span className="pmc-empty-icon">📡</span>
            <p>No active streams right now</p>
          </div>
        ) : (
          <div className="pmc-streamers-grid">
            {streamers.map((s, i) => {
              const username    = s.get("username")    || "Anonymous";
              const image       = s.get("image")       || null;
              const partyType   = s.get("party_type")  || "video";
              const joinedUsers = s.get("joined_users") || [];
              const channel     = s.get("streaming_channel") || "";
              const title       = s.get("title")       || "";
              const rank        = i + 1;
              const typeColor   = partyType === "video" ? "#4f9cf9" : partyType === "audio" ? "#a78bfa" : partyType === "multi" ? "#34d399" : "#94a3b8";
              return (
                <div key={s.id} className="pmc-streamer-card" style={{ animationDelay: `${i * 55}ms` }}>
                  <div className={`pmc-rank ${rank <= 3 ? `pmc-rank--top${rank}` : ""}`}>
                    {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
                  </div>
                  <div className="pmc-streamer-avatar-wrap">
                    {image
                      ? <img src={image} alt={username} className="pmc-streamer-avatar" />
                      : <div className="pmc-streamer-avatar pmc-streamer-avatar--initials">{getInitials(username)}</div>
                    }
                    <span className="pmc-streamer-live-ring" style={{ borderColor: typeColor }} />
                  </div>
                  <div className="pmc-streamer-info">
                    <span className="pmc-streamer-name">{username}</span>
                    {title && <span className="pmc-streamer-title">{title}</span>}
                    <div className="pmc-streamer-meta">
                      <span className="pmc-streamer-type" style={{ color: typeColor, borderColor: `${typeColor}44`, background: `${typeColor}11` }}>
                        {partyType === "video" ? "▶ Video" : partyType === "audio" ? "♬ Audio" : partyType === "multi" ? "⊞ Multi" : partyType}
                      </span>
                      <span className="pmc-streamer-viewers">👁 {joinedUsers.length.toLocaleString()}</span>
                    </div>
                    {channel && <span className="pmc-streamer-channel">#{channel}</span>}
                  </div>
                  <div className="pmc-streamer-bar-wrap">
                    <div className="pmc-streamer-bar" style={{
                      height: animated ? `${Math.max(12, (joinedUsers.length / Math.max(...streamers.map(x => (x.get("joined_users") || []).length), 1)) * 100)}%` : "0%",
                      background: typeColor, boxShadow: `0 0 10px ${typeColor}66`,
                      transitionDelay: `${i * 60}ms`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}