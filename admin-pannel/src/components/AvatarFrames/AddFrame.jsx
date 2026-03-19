// AddAvatarFrames.jsx
import React, { useState, useRef, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AddFrame.css";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
var SVGA_ACCEPT  = ".svga,application/octet-stream";
var IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + " MB";
  return Math.round(bytes / 1000) + " KB";
}

function isSvga(file) {
  if (!file) return false;
  return (
    file.name.toLowerCase().endsWith(".svga") ||
    file.type === "application/octet-stream" ||
    file.type === ""
  );
}

function isImage(file) {
  if (!file) return false;
  return file.type.startsWith("image/");
}

/* ─────────────────────────────────────────
   DROP ZONE COMPONENT
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
  var showImg   = props.showImg;   // show image preview when image file selected

  var inputRef    = useRef(null);
  var [drag, setDrag] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setDrag(true);
  }

  function handleDragLeave() {
    setDrag(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    var dropped = e.dataTransfer.files && e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }

  function handleClick() {
    if (!file) inputRef.current && inputRef.current.click();
  }

  function handleChange(e) {
    var chosen = e.target.files && e.target.files[0];
    if (chosen) onFile(chosen);
    // reset so same file can be re-selected
    e.target.value = "";
  }

  function handleClearClick(e) {
    e.stopPropagation();
    onClear();
  }

  var zoneClass = "avf-drop";
  if (drag) zoneClass += " drag";
  if (file) zoneClass += " filled";

  var imgSrc = (file && showImg && isImage(file))
    ? URL.createObjectURL(file)
    : null;

  return (
    <div
      className={zoneClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Hidden file input — NOT inside the drop overlay so it doesn't eat clicks */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {file ? (
        <>
          <div className="avf-file-info">
            {imgSrc ? (
              <img src={imgSrc} alt="preview" className="avf-img-prev" />
            ) : (
              <div className="avf-file-big">{icon}</div>
            )}
            <div className="avf-file-name" title={file.name}>{file.name}</div>
            <div className="avf-file-size">{fmtSize(file.size)}</div>
            <div className="avf-file-ready">✓ Ready to upload</div>
          </div>

          <button
            className="avf-file-clr"
            type="button"
            title="Remove file"
            onClick={handleClearClick}
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <div className="avf-drop-ico">{icon}</div>
          <div className="avf-drop-title">
            {drag ? "Release to upload" : title}
          </div>
          <div className="avf-drop-sub">{subtitle}</div>
          <button
            className="avf-browse"
            type="button"
            onClick={function(e) {
              e.stopPropagation();
              inputRef.current && inputRef.current.click();
            }}
          >
            Browse files
          </button>
          <span className="avf-drop-badge">{badgeText}</span>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AddAvatarFrames() {
  var [frameName,  setFrameName]  = useState("");
  var [credits,    setCredits]    = useState("");
  var [svgaFile,   setSvgaFile]   = useState(null);
  var [previewImg, setPreviewImg] = useState(null);

  var [errors,     setErrors]     = useState({});
  var [saving,     setSaving]     = useState(false);
  var [progress,   setProgress]   = useState(0);
  var [progMsg,    setProgMsg]     = useState("");
  var [success,    setSuccess]    = useState(null);
  var [submitErr,  setSubmitErr]  = useState("");

  /* ── clear one error ── */
  function clearErr(key) {
    setErrors(function(prev) {
      var next = Object.assign({}, prev);
      delete next[key];
      return next;
    });
  }

  /* ── handle SVGA file ── */
  function handleSvgaFile(file) {
    if (!isSvga(file)) {
      setErrors(function(prev) {
        return Object.assign({}, prev, { svgaFile: "Only .svga files are accepted" });
      });
      return;
    }
    setSvgaFile(file);
    clearErr("svgaFile");
  }

  /* ── handle preview image ── */
  function handlePreviewFile(file) {
    if (!isImage(file)) {
      setErrors(function(prev) {
        return Object.assign({}, prev, { previewImg: "Please choose a PNG, JPG or WEBP image" });
      });
      return;
    }
    setPreviewImg(file);
    clearErr("previewImg");
  }

  /* ── validate ── */
  function validate() {
    var e = {};
    if (!frameName.trim())                   e.frameName  = "Frame name is required";
    if (!credits || isNaN(Number(credits)) || Number(credits) < 0)
                                              e.credits    = "Enter a valid credit amount";
    if (!svgaFile)                            e.svgaFile   = "SVGA file is required";
    if (!previewImg)                          e.previewImg = "Preview image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── reset ── */
  function handleReset() {
    setFrameName("");
    setCredits("");
    setSvgaFile(null);
    setPreviewImg(null);
    setErrors({});
    setSuccess(null);
    setSubmitErr("");
    setProgress(0);
    setProgMsg("");
  }

  /* ── save to parse ── */
  async function handleSave() {
    setSubmitErr("");
    if (!validate()) return;

    setSaving(true);
    setProgress(5);
    setProgMsg("Preparing…");

    try {
      // 1. Upload SVGA
      setProgress(15);
      setProgMsg("Uploading SVGA file…");

      var svgaParseFile = new Parse.File(
        svgaFile.name.replace(/\s+/g, "_"),
        svgaFile
      );
      await svgaParseFile.save();
      setProgress(50);

      // 2. Upload preview image
      setProgress(55);
      setProgMsg("Uploading preview image…");

      var imgParseFile = new Parse.File(
        previewImg.name.replace(/\s+/g, "_"),
        previewImg
      );
      await imgParseFile.save();
      setProgress(85);

      // 3. Save Parse object
      setProgMsg("Saving to database…");

      var AvatarFrame = Parse.Object.extend("AvatarFrames");
      var obj = new AvatarFrame();
      obj.set("name",         frameName.trim());
      obj.set("assetName",    frameName.trim());
      obj.set("title",        frameName.trim());
      obj.set("credits",      parseFloat(credits));
      obj.set("price",        parseFloat(credits));
      obj.set("coins",        parseFloat(credits));
      obj.set("svgaFile",     svgaParseFile);
      obj.set("file",         svgaParseFile);
      obj.set("frameFile",    svgaParseFile);
      obj.set("previewImage", imgParseFile);
      obj.set("picture",      imgParseFile);
      obj.set("thumbnail",    imgParseFile);
      obj.set("category",     "avatar_frame");
      obj.set("type",         "avatar_frame");
      obj.set("isPrivate",    false);
      await obj.save();

      setProgress(100);
      setProgMsg("Done!");
      setSuccess({ name: frameName.trim(), id: obj.id });

      // auto-reset after 4 s
      setTimeout(function() { handleReset(); }, 4000);

    } catch (err) {
      console.error("Save error:", err);
      setSubmitErr(
        (err && err.message) ? err.message : "Upload failed. Please try again."
      );
      setProgress(0);
      setProgMsg("");
    } finally {
      setSaving(false);
    }
  }

  /* ── checklist for preview panel ── */
  var checks = useMemo(function() {
    return [
      { label: "Frame name",    done: !!frameName.trim() },
      { label: "Credits",       done: !!credits && !isNaN(Number(credits)) && Number(credits) >= 0 },
      { label: "SVGA file",     done: !!svgaFile },
      { label: "Preview image", done: !!previewImg },
    ];
  }, [frameName, credits, svgaFile, previewImg]);

  var allDone = checks.every(function(c) { return c.done; });

  var imgPreviewSrc = (previewImg && isImage(previewImg))
    ? URL.createObjectURL(previewImg)
    : null;

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="avf-page">
      <div className="avf-topline" />
      <div className="avf-wrap">

        {/* HEADER */}
        <div className="avf-header">
          <div className="avf-logo">🖼️</div>
          <div>
            <div className="avf-title">Add Avatar Frame</div>
            <div className="avf-subtitle">Upload a new avatar frame with SVGA animation &amp; preview image</div>
          </div>
        </div>

        {/* SUCCESS */}
        {success && (
          <div className="avf-success">
            <div className="avf-succ-ico">✓</div>
            <div className="avf-succ-text">
              "{success.name}" saved successfully!
              <small>ID: {success.id} · Form resets in 4 seconds…</small>
            </div>
          </div>
        )}

        {/* SUBMIT ERROR */}
        {submitErr && (
          <div className="avf-err-banner">✗ {submitErr}</div>
        )}

        {/* TWO-COLUMN LAYOUT */}
        <div className="avf-layout">

          {/* ── FORM COLUMN ── */}
          <div className="avf-form-col">

            {/* SECTION 1 — Frame Name */}
            <div className="avf-section">
              <div className="avf-sec-hdr">
                <div className="avf-sec-ico">✏️</div>
                <span className="avf-sec-title">Frame Name</span>
              </div>
              <div className="avf-sec-body">
                <div className="avf-field">
                  <label className="avf-label" htmlFor="avf-name">
                    Name <span className="avf-req">*</span>
                  </label>
                  <input
                    id="avf-name"
                    className="avf-input"
                    type="text"
                    value={frameName}
                    onChange={function(e) {
                      setFrameName(e.target.value);
                      clearErr("frameName");
                    }}
                    placeholder="e.g. Galaxy Halo, Golden Ring…"
                    maxLength={80}
                    autoComplete="off"
                  />
                  {errors.frameName && (
                    <span className="avf-field-err">⚠ {errors.frameName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2 — Credits */}
            <div className="avf-section">
              <div className="avf-sec-hdr">
                <div className="avf-sec-ico">🪙</div>
                <span className="avf-sec-title">Credits</span>
              </div>
              <div className="avf-sec-body">
                <div className="avf-field">
                  <label className="avf-label" htmlFor="avf-credits">
                    Credit Amount <span className="avf-req">*</span>
                  </label>
                  <div className="avf-credits-wrap">
                    <span className="avf-credits-pre">🪙</span>
                    <input
                      id="avf-credits"
                      className="avf-input avf-credits-input"
                      type="number"
                      min="0"
                      step="1"
                      value={credits}
                      onChange={function(e) {
                        setCredits(e.target.value);
                        clearErr("credits");
                      }}
                      placeholder="e.g. 50"
                    />
                  </div>
                  {errors.credits && (
                    <span className="avf-field-err">⚠ {errors.credits}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3 — SVGA File */}
            <div className="avf-section">
              <div className="avf-sec-hdr">
                <div className="avf-sec-ico">🌀</div>
                <span className="avf-sec-title">
                  SVGA File <span style={{ color: "var(--indigo)", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: ".78rem" }}>*</span>
                </span>
              </div>
              <div className="avf-sec-body">
                <DropZone
                  accept={SVGA_ACCEPT}
                  file={svgaFile}
                  onFile={handleSvgaFile}
                  onClear={function() { setSvgaFile(null); }}
                  icon="🌀"
                  title="Drop SVGA animation here"
                  subtitle="or click Browse files below"
                  badgeText=".SVGA format"
                  showImg={false}
                />
                {errors.svgaFile && (
                  <span className="avf-field-err" style={{ marginTop: 8, display: "flex" }}>
                    ⚠ {errors.svgaFile}
                  </span>
                )}
              </div>
            </div>

            {/* SECTION 4 — Preview Image */}
            <div className="avf-section">
              <div className="avf-sec-hdr">
                <div className="avf-sec-ico">🖼️</div>
                <span className="avf-sec-title">
                  Preview Image <span style={{ color: "var(--indigo)", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: ".78rem" }}>*</span>
                </span>
              </div>
              <div className="avf-sec-body">
                <DropZone
                  accept={IMAGE_ACCEPT}
                  file={previewImg}
                  onFile={handlePreviewFile}
                  onClear={function() { setPreviewImg(null); }}
                  icon="🖼️"
                  title="Drop preview image here"
                  subtitle="PNG, JPG or WEBP recommended"
                  badgeText="PNG · JPG · WEBP"
                  showImg={true}
                />
                {errors.previewImg && (
                  <span className="avf-field-err" style={{ marginTop: 8, display: "flex" }}>
                    ⚠ {errors.previewImg}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ── SIDE COLUMN — Live Preview ── */}
          <div className="avf-side-col">
            <div className="avf-preview-card">
              <div className="avf-prev-hdr">
                <span className="avf-live-dot" />
                <span className="avf-prev-title">Live Preview</span>
              </div>
              <div className="avf-prev-body">

                {/* Mock card */}
                <div className="avf-mock">
                  <div className={"avf-mock-thumb" + (imgPreviewSrc ? " has-img" : "")}>
                    {imgPreviewSrc
                      ? <img src={imgPreviewSrc} alt="frame preview" />
                      : <span>🖼️</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={"avf-mock-name" + (!frameName.trim() ? " empty" : "")}>
                      {frameName.trim() || "Frame name…"}
                    </div>
                    {credits && !isNaN(Number(credits)) && (
                      <div className="avf-mock-credits">
                        🪙 {Number(credits).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <div style={{
                    fontSize: ".66rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: ".09em",
                    color: "var(--t4)",
                    marginBottom: 8,
                  }}>
                    Completion
                  </div>
                  <div className="avf-checks">
                    {checks.map(function(c) {
                      return (
                        <div key={c.label} className={"avf-check" + (c.done ? " done" : "")}>
                          <div className="avf-check-ico">{c.done ? "✓" : ""}</div>
                          {c.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {allDone && (
                  <div className="avf-ready-msg">🚀 Ready to save!</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* PROGRESS BAR */}
        {saving && (
          <div className="avf-prog-wrap" style={{ marginTop: 16 }}>
            <div className="avf-prog-bar">
              <div className="avf-prog-fill" style={{ width: progress + "%" }} />
            </div>
            <div className="avf-prog-row">
              <span style={{ color: "var(--t3)", fontFamily: "var(--sans)" }}>{progMsg}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="avf-footer" style={{ marginTop: 16 }}>
          <div className="avf-foot-hint">
            Fields marked <strong style={{ color: "var(--indigo)" }}>*</strong> are required
          </div>
          <div className="avf-btn-group">
            <button
              className="avf-btn-reset"
              type="button"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </button>
            <button
              className="avf-btn-save"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="avf-save-spin" />
                  Uploading…
                </>
              ) : (
                <>🖼️ Save Frame</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}