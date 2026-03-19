// AddNewAssets.jsx
import React, { useState, useRef, useCallback, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AddNewAssets.css";

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const CATEGORIES = [
  {
    key:   "avatar_frame",
    label: "Avatar Frame",
    emoji: "🖼️",
    desc:  "Decorative borders displayed around user profile pictures",
    cls:   "frame",
  },
  {
    key:   "entrance_effect",
    label: "Entrance Effect",
    emoji: "✨",
    desc:  "Animated effects shown when a user enters a live room",
    cls:   "entrance",
  },
];

const VIP_LEVELS = Array.from({ length: 11 }, (_, i) => i + 1);

// Crown emoji gets more ornate at higher tiers
const vipCrown = (level) => {
  if (level === 11) return "👑";
  if (level >= 9)  return "💎";
  if (level >= 6)  return "🔥";
  if (level >= 3)  return "⭐";
  return "🏅";
};

const fmtSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  return Math.round(bytes / 1_000) + " KB";
};

/* ══════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════ */
export default function AddNewAssets() {
  const [assetName,  setAssetName]  = useState("");
  const [category,   setCategory]   = useState("");
  const [vipLevel,   setVipLevel]   = useState(null);
  const [svgaFile,   setSvgaFile]   = useState(null);
  const [dragging,   setDragging]   = useState(false);

  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [progressMsg,setProgressMsg]= useState("");
  const [success,    setSuccess]    = useState(null);
  const [submitErr,  setSubmitErr]  = useState("");

  const fileInputRef = useRef(null);

  /* ── Field change helpers ── */
  const clearErr = (key) => setErrors((p) => ({ ...p, [key]: "" }));

  /* ── Validate ── */
  const validate = () => {
    const e = {};
    if (!assetName.trim())        e.assetName = "Asset name is required";
    if (!category)                e.category  = "Please select a category";
    if (!vipLevel)                e.vipLevel  = "Please select a VIP level";
    if (!svgaFile)                e.svgaFile  = "SVGA file is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── File handling ── */
  const handleFile = useCallback((file) => {
    if (!file) return;
    // Accept .svga (also application/octet-stream since browsers may not know the MIME)
    const isValid = file.name.toLowerCase().endsWith(".svga") ||
      file.type === "application/octet-stream" ||
      file.type === "";
    if (!isValid) {
      setErrors((p) => ({ ...p, svgaFile: "Only .svga files are accepted" }));
      return;
    }
    setSvgaFile(file);
    clearErr("svgaFile");
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    setAssetName(""); setCategory(""); setVipLevel(null); setSvgaFile(null);
    setErrors({}); setSuccess(null); setSubmitErr("");
    setProgress(0); setProgressMsg("");
  }, []);

  /* ── Save ── */
  const handleSave = async () => {
    setSubmitErr("");
    if (!validate()) return;

    setSaving(true);
    setProgress(10);
    setProgressMsg("Preparing upload…");

    try {
      // Upload SVGA file
      setProgress(20);
      setProgressMsg("Uploading SVGA file…");

      const parseFile = new Parse.File(
        svgaFile.name.replace(/\s+/g, "_"),
        svgaFile
      );

      await parseFile.save({
        progress: (v) => {
          setProgress(20 + Math.round((v || 0) * 60));
        },
      });

      // Save Parse object
      setProgress(85);
      setProgressMsg("Saving asset record…");

      const Asset = Parse.Object.extend("Assets");
      const asset = new Asset();
      asset.set("name",      assetName.trim());
      asset.set("assetName", assetName.trim());
      asset.set("title",     assetName.trim());
      asset.set("category",  category);
      asset.set("type",      category);
      asset.set("vipLevel",  vipLevel);
      asset.set("vip",       vipLevel);
      asset.set("isVip",     true);
      asset.set("svgaFile",  parseFile);
      asset.set("file",      parseFile);

      await asset.save();

      setProgress(100);
      setProgressMsg("Done!");

      setSuccess({ name: assetName.trim(), id: asset.id });

      // Auto-reset after 4 s
      setTimeout(handleReset, 4000);

    } catch (err) {
      console.error("Save error:", err);
      setSubmitErr(err.message || "Upload failed. Please try again.");
      setProgress(0);
      setProgressMsg("");
    } finally {
      setSaving(false);
    }
  };

  /* ── Live preview checklist ── */
  const checks = useMemo(() => [
    { label: "Asset name",    done: !!assetName.trim() },
    { label: "Category",      done: !!category         },
    { label: "VIP level",     done: !!vipLevel          },
    { label: "SVGA file",     done: !!svgaFile          },
  ], [assetName, category, vipLevel, svgaFile]);

  const catInfo = CATEGORIES.find((c) => c.key === category);

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="ana-page">
      <div className="ana-topline" />
      <div className="ana-inner">

        {/* ── HEADER ── */}
        <div className="ana-header">
          <div className="ana-logo">🌟</div>
          <div>
            <div className="ana-title">Add New Asset</div>
            <div className="ana-subtitle">Upload avatar frames &amp; entrance effects with VIP access control</div>
          </div>
        </div>

        {/* ── SUCCESS ── */}
        {success && (
          <div className="ana-success">
            <div className="ana-success-icon">✓</div>
            <div className="ana-success-text">
              Asset "{success.name}" saved successfully!
              <small>Object ID: {success.id} · Form resets in 4 seconds…</small>
            </div>
          </div>
        )}

        {/* ── SUBMIT ERROR ── */}
        {submitErr && (
          <div className="ana-error-banner">✗ {submitErr}</div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="ana-form-grid">

          {/* ────── LEFT: FORM ────── */}
          <div className="ana-form-col">

            {/* SECTION 1 — Asset Name */}
            <div className="ana-section">
              <div className="ana-section-header">
                <div className="ana-section-icon">✏️</div>
                <span className="ana-section-title">Asset Name</span>
              </div>
              <div className="ana-section-body">
                <div className="ana-field">
                  <label className="ana-label" htmlFor="asset-name">
                    Name <span className="ana-req">*</span>
                  </label>
                  <input
                    id="asset-name"
                    className="ana-input"
                    type="text"
                    value={assetName}
                    onChange={(e) => { setAssetName(e.target.value); clearErr("assetName"); }}
                    placeholder="e.g. Galaxy Frame, Fire Entrance…"
                    maxLength={80}
                    autoComplete="off"
                  />
                  {errors.assetName && (
                    <span className="ana-field-err">⚠ {errors.assetName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2 — Category */}
            <div className="ana-section">
              <div className="ana-section-header">
                <div className="ana-section-icon">🏷️</div>
                <span className="ana-section-title">Category <span style={{ color: "var(--violet-light)", fontWeight: 400 }}>*</span></span>
              </div>
              <div className="ana-section-body">
                <div className="ana-cat-grid">
                  {CATEGORIES.map((cat) => (
                    <div
                      key={cat.key}
                      className={`ana-cat-card${category === cat.key ? ` selected-${cat.cls}` : ""}`}
                      onClick={() => { setCategory(cat.key); clearErr("category"); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setCategory(cat.key)}
                    >
                      <span className="ana-cat-check">
                        {category === cat.key ? "✓" : ""}
                      </span>
                      <div className="ana-cat-emoji">{cat.emoji}</div>
                      <div className="ana-cat-label">{cat.label}</div>
                      <div className="ana-cat-desc">{cat.desc}</div>
                    </div>
                  ))}
                </div>
                {errors.category && (
                  <span className="ana-field-err" style={{ marginTop: 10, display: "flex" }}>
                    ⚠ {errors.category}
                  </span>
                )}
              </div>
            </div>

            {/* SECTION 3 — VIP Level */}
            <div className="ana-section">
              <div className="ana-section-header">
                <div className="ana-section-icon">👑</div>
                <span className="ana-section-title">
                  VIP Level <span style={{ color: "var(--violet-light)", fontWeight: 400 }}>*</span>
                  {vipLevel && (
                    <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "var(--cyan-2)", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>
                      — VIP {vipLevel} selected
                    </span>
                  )}
                </span>
              </div>
              <div className="ana-section-body">
                <div className="ana-vip-grid">
                  {VIP_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      data-vip={String(lvl)}
                      className={`ana-vip-btn${vipLevel === lvl ? " active" : ""}`}
                      onClick={() => { setVipLevel(lvl); clearErr("vipLevel"); }}
                      title={`VIP ${lvl}`}
                    >
                      <span className="ana-vip-crown">{vipCrown(lvl)}</span>
                      <span className="ana-vip-num">VIP {lvl}</span>
                    </button>
                  ))}
                </div>
                {errors.vipLevel && (
                  <span className="ana-field-err" style={{ marginTop: 10, display: "flex" }}>
                    ⚠ {errors.vipLevel}
                  </span>
                )}
              </div>
            </div>

            {/* SECTION 4 — SVGA File */}
            <div className="ana-section">
              <div className="ana-section-header">
                <div className="ana-section-icon">📁</div>
                <span className="ana-section-title">
                  SVGA File <span style={{ color: "var(--violet-light)", fontWeight: 400 }}>*</span>
                </span>
              </div>
              <div className="ana-section-body">
                <div
                  className={`ana-dropzone${dragging ? " drag" : ""}${svgaFile ? " filled" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !svgaFile && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svga,application/octet-stream"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])}
                  />

                  {svgaFile ? (
                    <>
                      <div className="ana-file-info">
                        <div className="ana-file-icon-big">🌀</div>
                        <div className="ana-file-name-tag" title={svgaFile.name}>
                          {svgaFile.name}
                        </div>
                        <div className="ana-file-size-tag">{fmtSize(svgaFile.size)}</div>
                        <div style={{
                          marginTop: 4,
                          padding: "3px 10px",
                          background: "var(--cyan-dim)",
                          border: "1px solid var(--cyan-border)",
                          borderRadius: 20,
                          fontSize: "0.68rem",
                          color: "var(--cyan-2)",
                          fontWeight: 700,
                        }}>
                          ✓ Ready to upload
                        </div>
                      </div>
                      <button
                        className="ana-file-clear"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSvgaFile(null); }}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="ana-dz-icon-wrap">🌀</div>
                      <div className="ana-dz-title">
                        {dragging ? "Release to upload" : "Drop your SVGA file here"}
                      </div>
                      <div className="ana-dz-sub">or</div>
                      <span
                        className="ana-browse-link"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      >
                        Browse files
                      </span>
                      <span className="ana-svga-badge">
                        .SVGA format only
                      </span>
                    </>
                  )}
                </div>
                {errors.svgaFile && (
                  <span className="ana-field-err" style={{ marginTop: 8, display: "flex" }}>
                    ⚠ {errors.svgaFile}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ────── RIGHT: LIVE PREVIEW ────── */}
          <div className="ana-preview-col">
            <div className="ana-preview-panel">
              <div className="ana-preview-header">
                <span className="ana-live-dot" />
                <span className="ana-preview-title">Live Preview</span>
              </div>
              <div className="ana-preview-body">

                {/* Asset card mock */}
                <div className="ana-asset-mock">
                  <div className={`ana-mock-thumb${svgaFile ? " has-file" : ""}`}>
                    {svgaFile ? "🌀" : catInfo ? catInfo.emoji : "📦"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={`ana-mock-name${!assetName.trim() ? " empty" : ""}`}>
                      {assetName.trim() || "Asset name…"}
                    </div>
                    <div className="ana-mock-tags" style={{ marginTop: 6 }}>
                      {catInfo && (
                        <span className={`ana-mock-cat-tag ${catInfo.cls}`}>
                          {catInfo.emoji} {catInfo.label}
                        </span>
                      )}
                      {vipLevel && (
                        <span className="ana-mock-vip-tag">
                          {vipCrown(vipLevel)} VIP {vipLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Completion checklist */}
                <div>
                  <div style={{
                    fontSize: "0.67rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    color: "var(--text-4)",
                    marginBottom: 8,
                  }}>
                    Completion
                  </div>
                  <div className="ana-checklist">
                    {checks.map((c) => (
                      <div key={c.label} className={`ana-check-row${c.done ? " done" : ""}`}>
                        <div className="ana-check-icon">{c.done ? "✓" : ""}</div>
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* All-done message */}
                {checks.every((c) => c.done) && (
                  <div style={{
                    padding: "10px 14px",
                    background: "var(--success-dim)",
                    border: "1px solid var(--success-border)",
                    borderRadius: "var(--r-md)",
                    fontSize: "0.8rem",
                    color: "var(--success)",
                    fontWeight: 700,
                    textAlign: "center",
                    animation: "fadeDown 0.3s var(--ease)",
                  }}>
                    🚀 Ready to save!
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>{/* end .ana-form-grid */}

        {/* ── UPLOAD PROGRESS ── */}
        {saving && (
          <div className="ana-section" style={{ marginTop: 16 }}>
            <div className="ana-progress-wrap" style={{ padding: "16px 20px" }}>
              <div className="ana-progress-bar">
                <div className="ana-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="ana-progress-info">
                <span>{progressMsg}</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER / SAVE ── */}
        <div className="ana-footer-card" style={{ marginTop: 16 }}>
          <div className="ana-footer-hint">
            Fields marked <strong style={{ color: "var(--violet-light)" }}>*</strong> are required
          </div>
          <div className="ana-btn-group">
            <button
              className="ana-btn-reset"
              type="button"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </button>
            <button
              className="ana-btn-save"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="ana-save-spinner" />
                  Uploading…
                </>
              ) : (
                <>🌟 Save Asset</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}