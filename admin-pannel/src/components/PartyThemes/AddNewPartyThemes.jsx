// AddNewPartyThemes.jsx
import React, { useState, useRef, useMemo } from "react";
import Parse from "../../parseConfig";
import "./AddNewPartyThemes.css";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
var IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + " MB";
  return Math.round(bytes / 1000) + " KB";
}

function isImage(file) {
  if (!file) return false;
  return file.type.startsWith("image/");
}

/* ─────────────────────────────────────────
   DROP ZONE COMPONENT
───────────────────────────────────────── */
function DropZone(props) {
  var accept   = props.accept;
  var file     = props.file;
  var onFile   = props.onFile;
  var onClear  = props.onClear;
  var hasError = props.hasError;

  var inputRef        = useRef(null);
  var [drag, setDrag] = useState(false);

  var imgSrc = file && isImage(file) ? URL.createObjectURL(file) : null;

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

  var cls = "apt-drop";
  if (drag)     cls += " drag";
  if (file)     cls += " filled";
  if (hasError) cls += " error";

  return (
    <div
      className={cls}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {file ? (
        <>
          <div className="apt-file-info">
            {imgSrc ? (
              <img src={imgSrc} alt="preview" className="apt-img-prev" />
            ) : (
              <div className="apt-file-big">🖼️</div>
            )}
            <div className="apt-file-name" title={file.name}>{file.name}</div>
            <div className="apt-file-meta">
              <span className="apt-file-size">{fmtSize(file.size)}</span>
              <span className="apt-file-ready">✓ Ready</span>
            </div>
          </div>
          <button className="apt-file-clr" type="button" onClick={handleClear} title="Remove">✕</button>
        </>
      ) : (
        <>
          <div className="apt-drop-ico">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 4v12M8 8l4-4 4 4"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="apt-drop-title">
            {drag ? "Drop it here!" : "Drag & drop your PNG here"}
          </div>
          <div className="apt-drop-sub">PNG, JPG or WEBP · max 10 MB</div>
          <button
            className="apt-browse"
            type="button"
            onClick={function(e) { e.stopPropagation(); inputRef.current && inputRef.current.click(); }}
          >
            Browse files
          </button>
          <span className="apt-drop-badge">PNG · JPG · WEBP</span>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AddNewPartyThemes() {
  var [themeName,  setThemeName]  = useState("");
  var [credits,    setCredits]    = useState("");
  var [pngFile,    setPngFile]    = useState(null);

  var [errors,     setErrors]     = useState({});
  var [saving,     setSaving]     = useState(false);
  var [progress,   setProgress]   = useState(0);
  var [progMsg,    setProgMsg]    = useState("");
  var [success,    setSuccess]    = useState(null);
  var [submitErr,  setSubmitErr]  = useState("");

  function clearErr(key) {
    setErrors(function(prev) {
      var next = Object.assign({}, prev);
      delete next[key];
      return next;
    });
  }

  function handlePngFile(file) {
    if (!isImage(file)) {
      setErrors(function(prev) {
        return Object.assign({}, prev, { pngFile: "Please choose a PNG, JPG or WEBP image" });
      });
      return;
    }
    setPngFile(file);
    clearErr("pngFile");
  }

  function validate() {
    var e = {};
    if (!themeName.trim())
      e.themeName = "Party theme name is required";
    if (!credits || isNaN(Number(credits)) || Number(credits) < 0)
      e.credits   = "Enter a valid credit amount";
    if (!pngFile)
      e.pngFile   = "PNG file is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleReset() {
    setThemeName(""); setCredits(""); setPngFile(null);
    setErrors({}); setSuccess(null); setSubmitErr("");
    setProgress(0); setProgMsg("");
  }

  async function handleSave() {
    setSubmitErr("");
    if (!validate()) return;

    setSaving(true);
    setProgress(10);
    setProgMsg("Preparing…");

    try {
      setProgress(25);
      setProgMsg("Uploading image…");

      var imgParseFile = new Parse.File(
        pngFile.name.replace(/\s+/g, "_"),
        pngFile
      );
      await imgParseFile.save();
      setProgress(75);

      setProgMsg("Saving to database…");
      var PartyTheme = Parse.Object.extend("PartyThemes");
      var obj = new PartyTheme();
      obj.set("name",     themeName.trim());
      obj.set("title",    themeName.trim());
      obj.set("credits",  parseFloat(credits));
      obj.set("price",    parseFloat(credits));
      obj.set("coins",    parseFloat(credits));
      obj.set("file",     imgParseFile);
      obj.set("image",    imgParseFile);
      obj.set("picture",  imgParseFile);
      obj.set("category", "party_theme");
      obj.set("type",     "party_theme");
      await obj.save();

      setProgress(100);
      setProgMsg("Done!");
      setSuccess({ name: themeName.trim(), id: obj.id });
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
      { label: "Theme name",  done: !!themeName.trim() },
      { label: "Credits",     done: !!credits && !isNaN(Number(credits)) && Number(credits) >= 0 },
      { label: "PNG file",    done: !!pngFile },
    ];
  }, [themeName, credits, pngFile]);

  var allDone     = checks.every(function(c) { return c.done; });
  var imgPreview  = pngFile && isImage(pngFile) ? URL.createObjectURL(pngFile) : null;
  var doneCount   = checks.filter(function(c) { return c.done; }).length;
  var pct         = Math.round((doneCount / checks.length) * 100);

  return (
    <div className="apt-page">
      <div className="apt-topline" />
      <div className="apt-wrap">

        {/* HEADER */}
        <div className="apt-header">
          <div className="apt-logo">🎉</div>
          <div>
            <div className="apt-title">Add New Party Theme</div>
            <div className="apt-subtitle">Upload a party theme with name, credits &amp; PNG file</div>
          </div>
        </div>

        {/* SUCCESS */}
        {success && (
          <div className="apt-success">
            <div className="apt-succ-ico">✓</div>
            <div className="apt-succ-text">
              "{success.name}" saved!
              <small>ID: {success.id} · Form resets in 4 s…</small>
            </div>
          </div>
        )}

        {/* ERROR */}
        {submitErr && (
          <div className="apt-err-banner">✗ {submitErr}</div>
        )}

        {/* LAYOUT */}
        <div className="apt-layout">

          {/* ── FORM ── */}
          <div className="apt-form-col">

            {/* Party Theme Name */}
            <div className="apt-section">
              <div className="apt-sec-hdr">
                <div className="apt-sec-ico">🎊</div>
                <span className="apt-sec-title">Party Theme Name</span>
                <span className="apt-req-badge">Required</span>
              </div>
              <div className="apt-sec-body">
                <div className="apt-field">
                  <label className="apt-label" htmlFor="apt-name">
                    Name <span className="apt-req">*</span>
                  </label>
                  <input
                    id="apt-name"
                    className={"apt-input" + (errors.themeName ? " has-err" : "")}
                    type="text"
                    value={themeName}
                    onChange={function(e) { setThemeName(e.target.value); clearErr("themeName"); }}
                    placeholder="e.g. Tropical Luau, Galaxy Night…"
                    maxLength={80}
                    autoComplete="off"
                  />
                  {errors.themeName && (
                    <span className="apt-field-err">⚠ {errors.themeName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="apt-section">
              <div className="apt-sec-hdr">
                <div className="apt-sec-ico">🪙</div>
                <span className="apt-sec-title">Credits</span>
                <span className="apt-req-badge">Required</span>
              </div>
              <div className="apt-sec-body">
                <div className="apt-field">
                  <label className="apt-label" htmlFor="apt-credits">
                    Credit Amount <span className="apt-req">*</span>
                  </label>
                  <div className="apt-credits-wrap">
                    <span className="apt-credits-pre">🪙</span>
                    <input
                      id="apt-credits"
                      className={"apt-input apt-credits-input" + (errors.credits ? " has-err" : "")}
                      type="number"
                      min="0"
                      step="1"
                      value={credits}
                      onChange={function(e) { setCredits(e.target.value); clearErr("credits"); }}
                      placeholder="e.g. 100"
                    />
                  </div>
                  {errors.credits && (
                    <span className="apt-field-err">⚠ {errors.credits}</span>
                  )}
                </div>
              </div>
            </div>

            {/* PNG File */}
            <div className="apt-section">
              <div className="apt-sec-hdr">
                <div className="apt-sec-ico">🖼️</div>
                <span className="apt-sec-title">PNG File</span>
                <span className="apt-req-badge">Required</span>
              </div>
              <div className="apt-sec-body">
                <DropZone
                  accept={IMAGE_ACCEPT}
                  file={pngFile}
                  onFile={handlePngFile}
                  onClear={function() { setPngFile(null); }}
                  hasError={!!errors.pngFile}
                />
                {errors.pngFile && (
                  <span className="apt-field-err" style={{ marginTop: 8, display: "flex" }}>
                    ⚠ {errors.pngFile}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ── SIDE PANEL ── */}
          <div className="apt-side-col">
            <div className="apt-preview-card">

              {/* Live dot header */}
              <div className="apt-prev-hdr">
                <span className="apt-live-dot" />
                <span className="apt-prev-title">Live Preview</span>
              </div>

              <div className="apt-prev-body">

                {/* Mock theme card */}
                <div className="apt-mock">
                  <div className={"apt-mock-thumb" + (imgPreview ? " has-img" : "")}>
                    {imgPreview
                      ? <img src={imgPreview} alt="preview" />
                      : <span>🎉</span>
                    }
                  </div>
                  <div className="apt-mock-info">
                    <div className={"apt-mock-name" + (!themeName.trim() ? " empty" : "")}>
                      {themeName.trim() || "Theme name…"}
                    </div>
                    {credits && !isNaN(Number(credits)) && Number(credits) >= 0 && (
                      <div className="apt-mock-credits">
                        🪙 {Number(credits).toLocaleString()} credits
                      </div>
                    )}
                    {pngFile && (
                      <div className="apt-mock-file">
                        🖼️ {pngFile.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress ring */}
                <div className="apt-ring-wrap">
                  <svg className="apt-ring" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" className="apt-ring-bg" />
                    <circle
                      cx="32" cy="32" r="26"
                      className="apt-ring-fill"
                      strokeDasharray={"163.4"}
                      strokeDashoffset={163.4 - (163.4 * pct / 100)}
                    />
                  </svg>
                  <div className="apt-ring-pct">{pct}%</div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="apt-check-title">Completion</div>
                  <div className="apt-checks">
                    {checks.map(function(c) {
                      return (
                        <div key={c.label} className={"apt-check" + (c.done ? " done" : "")}>
                          <div className="apt-check-ico">{c.done ? "✓" : ""}</div>
                          {c.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {allDone && (
                  <div className="apt-ready-msg">🚀 Ready to save!</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* PROGRESS BAR */}
        {saving && (
          <div className="apt-prog-wrap">
            <div className="apt-prog-bar">
              <div className="apt-prog-fill" style={{ width: progress + "%" }} />
            </div>
            <div className="apt-prog-row">
              <span>{progMsg}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="apt-footer">
          <div className="apt-foot-hint">
            Fields marked <strong>*</strong> are required
          </div>
          <div className="apt-btn-group">
            <button
              className="apt-btn-reset"
              type="button"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </button>
            <button
              className="apt-btn-save"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><span className="apt-save-spin" /> Uploading…</>
              ) : (
                <>🎉 Save Theme</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}