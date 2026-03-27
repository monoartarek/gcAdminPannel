import React, { useEffect, useState } from "react";
import "./PieChartMF.css";


const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID     = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key":     MASTER_KEY,
  "Content-Type":           "application/json",
};

const AGE_GROUPS = [
  { label: "Under 18", min: 0,  max: 17  },
  { label: "18 – 24",  min: 18, max: 24  },
  { label: "25 – 34",  min: 25, max: 34  },
  { label: "35 – 44",  min: 35, max: 44  },
  { label: "45 – 54",  min: 45, max: 54  },
  { label: "55+",      min: 55, max: 999 },
];

const AGE_COLORS     = ["#818cf8","#38bdf8","#34d399","#fbbf24","#fb923c","#f87171"];
const COUNTRY_COLORS = ["#6366f1","#3b82f6","#06b6d4","#10b981","#f59e0b","#f43f5e","#8b5cf6","#ec4899"];

/* ── helper: calculate age from birthday ── */
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

export default function PieChartMF() {
  const [male,       setMale]       = useState(0);
  const [female,     setFemale]     = useState(0);
  const [ageCounts,  setAgeCounts]  = useState(Array(AGE_GROUPS.length).fill(0));
  const [countries,  setCountries]  = useState([]); // [{name, count}]
  const [loading,    setLoading]    = useState(true);
  const [hovered,    setHovered]    = useState(null);
  const [hoveredAge, setHoveredAge] = useState(null);
  const [hoveredCnt, setHoveredCnt] = useState(null);
  const [animated,   setAnimated]   = useState(false);

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    if (!loading) setTimeout(() => setAnimated(true), 100);
  }, [loading]);

  /* ── FETCH ALL USERS (paginated, up to 5000) ── */
  const fetchAllData = async () => {
    try {
      let allUsers = [];
      let skip     = 0;
      const limit  = 1000;

      while (true) {
        const res  = await fetch(
          `${SERVER_URL}/classes/_User?limit=${limit}&skip=${skip}&keys=gender,birthday,country`,
          { headers }
        );
        const json = await res.json();
        const batch = json.results || [];
        allUsers = [...allUsers, ...batch];
        if (batch.length < limit) break;
        skip += limit;
      }

      /* gender */
      let maleCount = 0, femaleCount = 0;

      /* age buckets */
      const ageBuckets = Array(AGE_GROUPS.length).fill(0);

      /* country map */
      const countryMap = {};

      allUsers.forEach((user) => {
        /* gender */
        const g = (user.gender || "").toLowerCase();
        if (g === "male")   maleCount++;
        if (g === "female") femaleCount++;

        /* age from birthday */
        const age = calcAge(user.birthday?.iso || user.birthday);
        if (age !== null) {
          for (let i = 0; i < AGE_GROUPS.length; i++) {
            if (age >= AGE_GROUPS[i].min && age <= AGE_GROUPS[i].max) {
              ageBuckets[i]++;
              break;
            }
          }
        }

        /* country */
        const c = (user.country || "").trim();
        if (c) countryMap[c] = (countryMap[c] || 0) + 1;
      });

      /* sort countries, keep top 8 */
      const sortedCountries = Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      setMale(maleCount);
      setFemale(femaleCount);
      setAgeCounts(ageBuckets);
      setCountries(sortedCountries);
    } catch (err) {
      alert("Fetch error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── PIE MATH ── */
  const total         = male + female;
  const malePercent   = total === 0 ? 50 : (male   / total) * 100;
  const femalePercent = total === 0 ? 50 : (female / total) * 100;

  const cx = 100, cy = 100, R = 78, IR = 48;

  const polar = (angle, radius) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arc = (a1, a2, ro, ri) => {
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
  };

  const maleAng    = (malePercent / 100) * 360;
  const malePath   = arc(0,       maleAng, R,     IR);
  const femalePath = arc(maleAng, 360,     R,     IR);
  const maleHov    = arc(0,       maleAng, R + 7, IR - 4);
  const femaleHov  = arc(maleAng, 360,     R + 7, IR - 4);

  /* ── AGE BAR MATH ── */
  const maxAge = Math.max(...ageCounts, 1);

  /* ── COUNTRY BAR MATH ── */
  const maxCnt = Math.max(...countries.map((c) => c.count), 1);

  if (loading) {
    return (
      <div className="pmc-loading">
        <div className="pmc-spinner" />
        <span>Loading charts…</span>
      </div>
    );
  }

  return (
    <div className={`pmc-grid ${animated ? "is-animated" : ""}`}>

      {/* ══ CARD 1 · GENDER PIE ══ */}
      <div className="pmc-card">
        <div className="pmc-card__head">
          <span className="pmc-card__title">Gender</span>
          <span className="pmc-card__badge">{total.toLocaleString()} users</span>
        </div>

        <div className="pmc-pie-wrap">
          <svg viewBox="0 0 200 200" className="pmc-pie-svg">
            <defs>
              <filter id="ps" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="5" floodOpacity="0.15" />
              </filter>
            </defs>

            {total > 0 && femalePercent > 0 && (
              <path
                d={hovered === "female" ? femaleHov : femalePath}
                className="pmc-slice pmc-slice--f"
                filter="url(#ps)"
                onMouseEnter={() => setHovered("female")}
                onMouseLeave={() => setHovered(null)}
              />
            )}
            {total > 0 && malePercent > 0 && (
              <path
                d={hovered === "male" ? maleHov : malePath}
                className="pmc-slice pmc-slice--m"
                filter="url(#ps)"
                onMouseEnter={() => setHovered("male")}
                onMouseLeave={() => setHovered(null)}
              />
            )}
            {total === 0 && <circle cx={cx} cy={cy} r={R} fill="#e2e8f0" />}

            <circle cx={cx} cy={cy} r={IR} className="pmc-hole" />

            <text x={cx} y={cy - 9}  className="pmc-center-num">
              {hovered === "male" ? male.toLocaleString()
                : hovered === "female" ? female.toLocaleString()
                : total.toLocaleString()}
            </text>
            <text x={cx} y={cy + 12} className="pmc-center-lbl">
              {hovered === "male" ? "Male" : hovered === "female" ? "Female" : "Total"}
            </text>
          </svg>

          <div className="pmc-legend">
            {[
              { key: "male",   label: "Male",   val: male,   pct: malePercent   },
              { key: "female", label: "Female", val: female, pct: femalePercent },
            ].map(({ key, label, val, pct }) => (
              <div
                key={key}
                className={`pmc-legend-row pmc-legend-row--${key} ${hovered === key ? "is-on" : ""}`}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={`pmc-dot pmc-dot--${key}`} />
                <div className="pmc-legend-info">
                  <span className="pmc-legend-name">{label}</span>
                  <span className="pmc-legend-val">{val.toLocaleString()}</span>
                </div>
                <span className="pmc-legend-pct">{pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CARD 2 · AGE BAR ══ */}
      <div className="pmc-card">
        <div className="pmc-card__head">
          <span className="pmc-card__title">Age Groups</span>
          <span className="pmc-card__badge">
            {ageCounts.reduce((a, b) => a + b, 0).toLocaleString()} users
          </span>
        </div>

        <div className="pmc-bars">
          {AGE_GROUPS.map((g, i) => {
            const pct = (ageCounts[i] / maxAge) * 100;
            return (
              <div
                key={g.label}
                className={`pmc-bar-row ${hoveredAge === i ? "is-on" : ""}`}
                onMouseEnter={() => setHoveredAge(i)}
                onMouseLeave={() => setHoveredAge(null)}
              >
                <span className="pmc-bar-label">{g.label}</span>
                <div className="pmc-bar-track">
                  <div
                    className="pmc-bar-fill"
                    style={{
                      width:           animated ? `${pct}%` : "0%",
                      background:      AGE_COLORS[i],
                      transitionDelay: `${i * 70}ms`,
                    }}
                  />
                </div>
                <span className="pmc-bar-count">{ageCounts[i].toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ CARD 3 · COUNTRY BAR ══ */}
      <div className="pmc-card">
        <div className="pmc-card__head">
          <span className="pmc-card__title">Top Countries</span>
          <span className="pmc-card__badge">
            {countries.reduce((a, b) => a + b.count, 0).toLocaleString()} users
          </span>
        </div>

        <div className="pmc-bars">
          {countries.length === 0 ? (
            <p className="pmc-empty">No country data available.</p>
          ) : (
            countries.map((c, i) => {
              const pct = (c.count / maxCnt) * 100;
              return (
                <div
                  key={c.name}
                  className={`pmc-bar-row ${hoveredCnt === i ? "is-on" : ""}`}
                  onMouseEnter={() => setHoveredCnt(i)}
                  onMouseLeave={() => setHoveredCnt(null)}
                >
                  <span className="pmc-bar-label">{c.name}</span>
                  <div className="pmc-bar-track">
                    <div
                      className="pmc-bar-fill"
                      style={{
                        width:           animated ? `${pct}%` : "0%",
                        background:      COUNTRY_COLORS[i % COUNTRY_COLORS.length],
                        transitionDelay: `${i * 70}ms`,
                      }}
                    />
                  </div>
                  <span className="pmc-bar-count">{c.count.toLocaleString()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}