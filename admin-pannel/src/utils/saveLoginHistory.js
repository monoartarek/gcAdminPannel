import Parse from "../parseConfig";

/* ════════════════════════════════════════════════════════════
   saveLoginHistory.js
   Call this function right after a successful admin login.
   It auto-detects: device, OS, browser, screen, IP, location.
   All fields are saved to Parse class: AdminLoginHistory
════════════════════════════════════════════════════════════ */

/* ── Detect OS from userAgent ── */
function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua))  return "Windows 10";
  if (/Windows NT 6.1/.test(ua)) return "Windows 7";
  if (/Windows/.test(ua))        return "Windows";
  if (/Mac OS X/.test(ua))       return "macOS";
  if (/iPhone|iPad/.test(ua))    return "iOS";
  if (/Android/.test(ua))        return "Android";
  if (/Linux/.test(ua))          return "Linux";
  return "Unknown OS";
}

/* ── Detect Browser ── */
function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))     return "Microsoft Edge";
  if (/OPR\//.test(ua))     return "Opera";
  if (/Chrome\//.test(ua))  return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua))  return "Safari";
  return "Unknown Browser";
}

/* ── Detect Device Type ── */
function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/.test(ua)) return "Mobile";
  if (/iPad|Tablet/.test(ua))         return "Tablet";
  return "Desktop";
}

/* ── Detect Device Name (best guess) ── */
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua))   return "iPhone";
  if (/iPad/.test(ua))     return "iPad";
  if (/Android/.test(ua)) {
    const match = ua.match(/Android [^;]+;\s*([^)]+)/);
    return match ? match[1].trim() : "Android Device";
  }
  if (/Mac/.test(ua))      return "Mac";
  if (/Windows/.test(ua))  return "Windows PC";
  return "Unknown Device";
}

/* ── Get IP + Location from free API ── */
async function getLocationInfo() {
  try {
    // Free service — no API key needed
    const res  = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return {
      ipAddress: data.ip        || "—",
      country:   data.country_name || "—",
      city:      data.city      || "—",
      region:    data.region    || "—",
      latitude:  data.latitude  || null,
      longitude: data.longitude || null,
    };
  } catch {
    // Fallback: try another free API
    try {
      const res  = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return {
        ipAddress: data.ip || "—",
        country: "—", city: "—", region: "—",
        latitude: null, longitude: null,
      };
    } catch {
      return {
        ipAddress: "—", country: "—", city: "—",
        region: "—", latitude: null, longitude: null,
      };
    }
  }
}

/* ════════════════════════════════════════════════════════════
   MAIN FUNCTION — call this after admin login success
   
   Usage:
     import { saveLoginHistory } from "../utils/saveLoginHistory";
     
     // After login:
     await saveLoginHistory(parseUserObject, "success");
     
     // After failed login attempt:
     await saveLoginHistory(null, "failed", "wrong-username@example.com");
════════════════════════════════════════════════════════════ */
export async function saveLoginHistory(adminUser, status = "success", fallbackUsername = "") {
  try {
    /* ── Gather all device info ── */
    const os         = detectOS();
    const browser    = detectBrowser();
    const deviceType = detectDeviceType();
    const device     = detectDevice();
    const screen     = `${window.screen.width}x${window.screen.height}`;
    const language   = navigator.language || "—";
    const timezone   = Intl.DateTimeFormat().resolvedOptions().timeZone || "—";

    /* ── Get location from IP (async) ── */
    const location = await getLocationInfo();

    /* ── Get admin info from Parse user object ── */
    let adminId       = "—";
    let adminName     = "—";
    let adminUsername = fallbackUsername || "—";
    let adminGender   = "—";
    let adminAvatar   = null;

    if (adminUser) {
      adminId       = adminUser.id || "—";
      adminName     = adminUser.get("name")     || adminUser.get("fullName") || "—";
      adminUsername = adminUser.get("username") || "—";
      adminGender   = adminUser.get("gender")   || "—";

      const av = adminUser.get("avatar") || adminUser.get("profileImage");
      if (av && typeof av.url === "function") adminAvatar = av.url();
      else if (typeof av === "string") adminAvatar = av;
    }

    /* ── Build the Parse object ── */
    const LoginHistory = Parse.Object.extend("AdminLoginHistory");
    const record       = new LoginHistory();

    /* Admin info */
    record.set("adminId",       adminId);
    record.set("adminName",     adminName);
    record.set("adminUsername", adminUsername);
    record.set("adminGender",   adminGender);
    if (adminAvatar) record.set("adminAvatar", adminAvatar);

    /* Device info */
    record.set("device",     device);
    record.set("deviceType", deviceType);
    record.set("os",         os);
    record.set("browser",    browser);
    record.set("screen",     screen);
    record.set("language",   language);
    record.set("timezone",   timezone);

    /* Location info */
    record.set("ipAddress", location.ipAddress);
    record.set("country",   location.country);
    record.set("city",      location.city);
    record.set("region",    location.region);
    if (location.latitude)  record.set("latitude",  location.latitude);
    if (location.longitude) record.set("longitude", location.longitude);

    /* Status + time */
    record.set("status",  status);   // "success" or "failed"
    record.set("loginAt", new Date());

    /* ── Save to Parse (no master key needed here) ── */
    await record.save(null, { useMasterKey: true });

    console.log("✅ Login history saved");
  } catch (err) {
    /* Never block login flow because of history save failure */
    console.warn("Login history save failed (non-critical):", err.message);
  }
}