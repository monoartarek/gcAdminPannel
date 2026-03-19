// AddNewEntranceEffect.jsx
import React, { useState, useRef, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AddNewEntranceEffect.css";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
var EFFECT_ACCEPT = ".svga,.mp4,video/mp4,application/octet-stream";
var IMAGE_ACCEPT  = "image/png,image/jpeg,image/webp,image/gif";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + " MB";
  return Math.round(bytes / 1000) + " KB";
}

function isEffectFile(file) {
  if (!file) return false;
  var name = file.name.toLowerCase();
  return (
    name.endsWith(".svga") ||
    name.endsWith(".mp4")  ||
    file.type === "video/mp4" ||
    file.type === "application/octet-stream" ||
    file.type === ""
  );
}

function isImage(file) {
  if (!file) return false;
  return file.type.startsWith("image/");
}

function getEffectType(file) {
  if (!file) return null;
  if (file.name.toLowerCase().endsWith(".mp4") || file.type === "video/mp4") return "mp4";
  return "svga";
}

/* ─────────────────────────────────────────
   DROP ZONE
───────────────────────────────────────── */
function DropZone(props) {
  var accept    = props.accept;
  var file      = props.file;
  var onFile    = props.onFile;
  var onClear   = props.onClear;
  var icon      = props.icon;
  var title     = props.title;
  var subtitle  = props.subtitle;
  var badgeText = props.badgeText;
  var showImg   = props.showImg;
  var hasError  = props.hasError;
  var accentVar = props.accentVar || "--ane-cyan";

  var inputRef        = useRef(null);
  var [drag, setDrag] = useState(false);

  var imgSrc = file && showImg && isImage(file) ? URL.createObjectURL(file) : null;
  var isVid  = file && getEffectType(file) === "mp4";

  function handleDragOver(e)  { e.preventDefault(); setDrag(true); }
  function handleDragLeave()  { setDrag(false); }
  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  }
  function handleClick() { if (!file) inputRef.current && inputRef.current.click(); }
  function handleChange(e) {
    var f = e.target.files && e.target.files[0];
    if (f) onFile(f);
    e.target.value = "";
  }
  function handleClear(e) { e.stopPropagation(); onClear(); }

  var cls = "ane-drop";
  if (drag)     cls += " drag";
  if (file)     cls += " filled";
  if (hasError) cls += " error";

  return (
    <div className={cls} style={{ "--drop-accent": "var(" + accentVar + ")" }}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave}
      onDrop={handleDrop} onClick={handleClick}>
      <input ref={inputRef} type="file" accept={accept}
        style={{ display:"none" }} onChange={handleChange} />

      {file ? (
        <>
          <div className="ane-file-info">
            {imgSrc ? (
              <img src={imgSrc} alt="preview" className="ane-img-prev" />
            ) : isVid ? (
              <div className="ane-file-type-badge mp4">▶ MP4</div>
            ) : (
              <div className="ane-file-type-badge svga">◈ SVGA</div>
            )}
            <div className="ane-file-name" title={file.name}>{file.name}</div>
            <div className="ane-file-meta">
              <span className="ane-file-size">{fmtSize(file.size)}</span>
              <span className="ane-file-ready">✓ Ready</span>
            </div>
          </div>
          <button className="ane-file-clr" type="button" onClick={handleClear} title="Remove">✕</button>
        </>
      ) : (
        <>
          <div className="ane-drop-ico">{icon}</div>
          <div className="ane-drop-title">{drag ? "Drop it here!" : title}</div>
          <div className="ane-drop-sub">{subtitle}</div>
          <button className="ane-browse" type="button"
            onClick={function(e) { e.stopPropagation(); inputRef.current && inputRef.current.click(); }}>
            Browse files
          </button>
          <span className="ane-drop-badge">{badgeText}</span>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AddNewEntranceEffect() {
  var [effectName,  setEffectName]  = useState("");
  var [credits,     setCredits]     = useState("");
  var [effectFile,  setEffectFile]  = useState(null);
  var [previewImg,  setPreviewImg]  = useState(null);

  var [errors,    setErrors]    = useState({});
  var [saving,    setSaving]    = useState(false);
  var [progress,  setProgress]  = useState(0);
  var [progMsg,   setProgMsg]   = useState("");
  var [success,   setSuccess]   = useState(null);
  var [submitErr, setSubmitErr] = useState("");

  function clearErr(key) {
    setErrors(function(prev) {
      var next = Object.assign({}, prev); delete next[key]; return next;
    });
  }

  function handleEffectFile(file) {
    if (!isEffectFile(file)) {
      setErrors(function(prev) {
        return Object.assign({}, prev, { effectFile: "Only .svga or .mp4 files are accepted" });
      });
      return;
    }
    setEffectFile(file); clearErr("effectFile");
  }

  function handlePreviewFile(file) {
    if (!isImage(file)) {
      setErrors(function(prev) {
        return Object.assign({}, prev, { previewImg: "Please choose a PNG, JPG or WEBP image" });
      });
      return;
    }
    setPreviewImg(file); clearErr("previewImg");
  }

  function validate() {
    var e = {};
    if (!effectName.trim())                                              e.effectName = "Effect name is required";
    if (!credits || isNaN(Number(credits)) || Number(credits) < 0)      e.credits    = "Enter a valid credit amount";
    if (!effectFile)                                                     e.effectFile = "Effect file (.svga or .mp4) is required";
    if (!previewImg)                                                     e.previewImg = "Preview image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleReset() {
    setEffectName(""); setCredits(""); setEffectFile(null); setPreviewImg(null);
    setErrors({}); setSuccess(null); setSubmitErr("");
    setProgress(0); setProgMsg("");
  }

  async function handleSave() {
    setSubmitErr("");
    if (!validate()) return;

    setSaving(true);
    setProgress(8);
    setProgMsg("Preparing…");

    try {
      // 1. Upload effect file
      setProgress(20);
      setProgMsg("Uploading effect file…");
      var effectParseFile = new Parse.File(
        effectFile.name.replace(/\s+/g, "_"), effectFile
      );
      await effectParseFile.save();
      setProgress(55);

      // 2. Upload preview image
      setProgress(60);
      setProgMsg("Uploading preview image…");
      var imgParseFile = new Parse.File(
        previewImg.name.replace(/\s+/g, "_"), previewImg
      );
      await imgParseFile.save();
      setProgress(85);

      // 3. Save Parse object
      setProgMsg("Saving to database…");
      var EntranceEffect = Parse.Object.extend("EntranceEffect");
      var obj = new EntranceEffect();
      obj.set("name",         effectName.trim());
      obj.set("assetName",    effectName.trim());
      obj.set("title",        effectName.trim());
      obj.set("credits",      parseFloat(credits));
      obj.set("price",        parseFloat(credits));
      obj.set("coins",        parseFloat(credits));
      obj.set("effectFile",   effectParseFile);
      obj.set("file",         effectParseFile);
      obj.set("svgaFile",     effectParseFile);
      obj.set("previewImage", imgParseFile);
      obj.set("picture",      imgParseFile);
      obj.set("thumbnail",    imgParseFile);
      obj.set("category",     "entrance_effect");
      obj.set("type",         "entrance_effect");
      obj.set("isPrivate",    false);
      obj.set("fileType",     getEffectType(effectFile));
      await obj.save();

      setProgress(100);
      setProgMsg("Done!");
      setSuccess({ name: effectName.trim(), id: obj.id });
      setTimeout(function() { handleReset(); }, 4000);

    } catch (err) {
      console.error("Save error:", err);
      setSubmitErr((err && err.message) ? err.message : "Upload failed. Please try again.");
      setProgress(0); setProgMsg("");
    } finally {
      setSaving(false);
    }
  }

  var checks = useMemo(function() {
    return [
      { label: "Effect name",    done: !!effectName.trim() },
      { label: "Credits",        done: !!credits && !isNaN(Number(credits)) && Number(credits) >= 0 },
      { label: "Effect file",    done: !!effectFile },
      { label: "Preview image",  done: !!previewImg },
    ];
  }, [effectName, credits, effectFile, previewImg]);

  var allDone     = checks.every(function(c) { return c.done; });
  var doneCount   = checks.filter(function(c) { return c.done; }).length;
  var pct         = Math.round((doneCount / checks.length) * 100);
  var imgPreview  = previewImg && isImage(previewImg) ? URL.createObjectURL(previewImg) : null;
  var effectType  = effectFile ? getEffectType(effectFile) : null;

  return (
    <div className="ane-page">
      <div className="ane-topline" />
      <div className="ane-wrap">

        {/* HEADER */}
        <div className="ane-header">
          <div className="ane-logo">
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
              <path d="M13 3L4 12l9 9M4 12h16" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="ane-title">Add New Entrance Effect</div>
            <div className="ane-subtitle">Upload an entrance effect with SVGA / MP4 animation &amp; preview image</div>
          </div>
        </div>

        {/* SUCCESS */}
        {success && (
          <div className="ane-success">
            <div className="ane-succ-ico">✓</div>
            <div className="ane-succ-text">
              "{success.name}" saved successfully!
              <small>ID: {success.id} · Form resets in 4 seconds…</small>
            </div>
          </div>
        )}

        {/* ERROR */}
        {submitErr && <div className="ane-err-banner">✗ {submitErr}</div>}

        {/* LAYOUT */}
        <div className="ane-layout">

          {/* ── FORM ── */}
          <div className="ane-form-col">

            {/* 1 — Effect Name */}
            <div className="ane-section">
              <div className="ane-sec-hdr">
                <div className="ane-sec-ico ane-ico-name">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="ane-sec-title">Entrance Effect Name</span>
                <span className="ane-req-pill">Required</span>
              </div>
              <div className="ane-sec-body">
                <div className="ane-field">
                  <label className="ane-label" htmlFor="ane-name">
                    Name <span className="ane-req">*</span>
                  </label>
                  <input
                    id="ane-name"
                    className={"ane-input" + (errors.effectName ? " has-err" : "")}
                    type="text"
                    value={effectName}
                    onChange={function(e) { setEffectName(e.target.value); clearErr("effectName"); }}
                    placeholder="e.g. Neon Burst, Fire Spin, Star Shower…"
                    maxLength={80}
                    autoComplete="off"
                  />
                  {errors.effectName && <span className="ane-field-err">⚠ {errors.effectName}</span>}
                </div>
              </div>
            </div>

            {/* 2 — Credits */}
            <div className="ane-section">
              <div className="ane-sec-hdr">
                <div className="ane-sec-ico ane-ico-credits">🪙</div>
                <span className="ane-sec-title">Credits</span>
                <span className="ane-req-pill">Required</span>
              </div>
              <div className="ane-sec-body">
                <div className="ane-field">
                  <label className="ane-label" htmlFor="ane-credits">
                    Credit Amount <span className="ane-req">*</span>
                  </label>
                  <div className="ane-credits-wrap">
                    <span className="ane-credits-pre">🪙</span>
                    <input
                      id="ane-credits"
                      className={"ane-input ane-credits-input" + (errors.credits ? " has-err" : "")}
                      type="number"
                      min="0"
                      step="1"
                      value={credits}
                      onChange={function(e) { setCredits(e.target.value); clearErr("credits"); }}
                      placeholder="e.g. 150"
                    />
                  </div>
                  {errors.credits && <span className="ane-field-err">⚠ {errors.credits}</span>}
                </div>
              </div>
            </div>

            {/* 3 — Effect File */}
            <div className="ane-section">
              <div className="ane-sec-hdr">
                <div className="ane-sec-ico ane-ico-effect">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="ane-sec-title">Effect File</span>
                <span className="ane-req-pill">Required</span>
              </div>
              <div className="ane-sec-body">
                {/* Format toggle hint */}
                <div className="ane-format-row">
                  <span className={"ane-fmt-tag" + (effectType === "svga" ? " active" : "")}>◈ SVGA</span>
                  <span className="ane-fmt-sep">or</span>
                  <span className={"ane-fmt-tag mp4" + (effectType === "mp4" ? " active" : "")}>▶ MP4</span>
                  <span className="ane-fmt-hint">Both formats supported</span>
                </div>

                <DropZone
                  accept={EFFECT_ACCEPT}
                  file={effectFile}
                  onFile={handleEffectFile}
                  onClear={function() { setEffectFile(null); }}
                  icon={
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  }
                  title="Drop SVGA or MP4 file here"
                  subtitle="Drag & drop or click to browse"
                  badgeText=".SVGA · .MP4"
                  showImg={false}
                  hasError={!!errors.effectFile}
                  accentVar="--ane-cyan"
                />
                {errors.effectFile && (
                  <span className="ane-field-err" style={{ marginTop:8, display:"flex" }}>⚠ {errors.effectFile}</span>
                )}
              </div>
            </div>

            {/* 4 — Preview Image */}
            <div className="ane-section">
              <div className="ane-sec-hdr">
                <div className="ane-sec-ico ane-ico-img">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="ane-sec-title">Preview Image</span>
                <span className="ane-req-pill">Required</span>
              </div>
              <div className="ane-sec-body">
                <DropZone
                  accept={IMAGE_ACCEPT}
                  file={previewImg}
                  onFile={handlePreviewFile}
                  onClear={function() { setPreviewImg(null); }}
                  icon={
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  }
                  title="Drop preview image here"
                  subtitle="PNG, JPG or WEBP recommended"
                  badgeText="PNG · JPG · WEBP"
                  showImg={true}
                  hasError={!!errors.previewImg}
                  accentVar="--ane-sky"
                />
                {errors.previewImg && (
                  <span className="ane-field-err" style={{ marginTop:8, display:"flex" }}>⚠ {errors.previewImg}</span>
                )}
              </div>
            </div>

          </div>

          {/* ── SIDE PANEL ── */}
          <div className="ane-side-col">
            <div className="ane-preview-card">

              <div className="ane-prev-hdr">
                <span className="ane-live-dot" />
                <span className="ane-prev-title">Live Preview</span>
              </div>

              <div className="ane-prev-body">

                {/* Mock card */}
                <div className="ane-mock">
                  <div className="ane-mock-frame">
                    <div className={"ane-mock-thumb" + (imgPreview ? " has-img" : "")}>
                      {imgPreview
                        ? <img src={imgPreview} alt="preview" />
                        : <span className="ane-mock-placeholder">✨</span>
                      }
                    </div>
                    {effectType && (
                      <div className={"ane-mock-effect-tag " + effectType}>
                        {effectType === "mp4" ? "▶ MP4" : "◈ SVGA"}
                      </div>
                    )}
                  </div>
                  <div className="ane-mock-info">
                    <div className={"ane-mock-name" + (!effectName.trim() ? " empty" : "")}>
                      {effectName.trim() || "Effect name…"}
                    </div>
                    {credits && !isNaN(Number(credits)) && Number(credits) >= 0 && (
                      <div className="ane-mock-credits">🪙 {Number(credits).toLocaleString()} credits</div>
                    )}
                    {effectFile && (
                      <div className={"ane-mock-file-pill " + (effectType || "")}>
                        {effectType === "mp4" ? "▶" : "◈"} {effectFile.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ring */}
                <div className="ane-ring-wrap">
                  <svg className="ane-ring" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="29" className="ane-ring-bg" />
                    <circle cx="36" cy="36" r="29"
                      className="ane-ring-fill"
                      strokeDasharray="182.2"
                      strokeDashoffset={182.2 - (182.2 * pct / 100)}
                    />
                  </svg>
                  <div className="ane-ring-pct">{pct}%</div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="ane-check-title">Completion</div>
                  <div className="ane-checks">
                    {checks.map(function(c) {
                      return (
                        <div key={c.label} className={"ane-check" + (c.done ? " done" : "")}>
                          <div className="ane-check-ico">{c.done ? "✓" : ""}</div>
                          {c.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {allDone && <div className="ane-ready-msg">🚀 Ready to save!</div>}
              </div>
            </div>
          </div>

        </div>

        {/* PROGRESS */}
        {saving && (
          <div className="ane-prog-wrap">
            <div className="ane-prog-track">
              <div className="ane-prog-fill" style={{ width: progress + "%" }} />
            </div>
            <div className="ane-prog-row">
              <span>{progMsg}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="ane-footer">
          <div className="ane-foot-hint">
            Fields marked <strong>*</strong> are required
          </div>
          <div className="ane-btn-group">
            <button className="ane-btn-reset" type="button" onClick={handleReset} disabled={saving}>
              Reset
            </button>
            <button className="ane-btn-save" type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><span className="ane-save-spin" /> Uploading…</>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d="M13 3L4 12l9 9M4 12h16" stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save Effect
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}