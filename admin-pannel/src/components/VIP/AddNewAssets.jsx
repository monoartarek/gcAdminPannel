import React, { useState, useEffect, useRef } from "react";
import Parse from "../../parseConfig";
import "./AddNewAssets.css";

// ── File field definitions ────────────────────────────────────────────────────
const FILE_FIELDS = [
  { key: "frame",               label: "Frame",             type: "svga",  icon: "🎬" },
  { key: "frame_image",         label: "Frame Image",       type: "image", icon: "🖼️" },
  { key: "Medal",               label: "Medal",             type: "svga",  icon: "🎬" },
  { key: "Medal_image",         label: "Medal Image",       type: "image", icon: "🖼️" },
  { key: "short_bg",            label: "Short BG",          type: "svga",  icon: "🎬" },
  { key: "short_bg_image",      label: "Short BG Image",    type: "image", icon: "🖼️" },
  { key: "short_bg_header",     label: "Short BG Header",   type: "image", icon: "🖼️" },
  { key: "chat_room_bubble",    label: "Chat Bubble",       type: "image", icon: "💬" },
  { key: "tags",                label: "Tags",              type: "image", icon: "🏷️" },
  { key: "floating_entry_image",label: "Float Entry Img",   type: "image", icon: "🖼️" },
  { key: "floating_entry",      label: "Float Entry",       type: "svga",  icon: "🎬" },
  { key: "mic",                 label: "Mic",               type: "svga",  icon: "🎬" },
  { key: "mic_image",           label: "Mic Image",         type: "image", icon: "🎤" },
];

const ACCEPT = { svga: ".svga", image: ".png,.webp,.jpg,.jpeg" };

// ── Small helpers ─────────────────────────────────────────────────────────────
const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="4" width="18" height="2.5" rx="1.25"/>
    <rect x="3" y="10.75" width="18" height="2.5" rx="1.25"/>
    <rect x="3" y="17.5" width="18" height="2.5" rx="1.25"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const Spinner = ({ sm }) => <span className={sm ? "va-spinner-sm" : "va-spinner"}/>;

// ── Image preview modal ───────────────────────────────────────────────────────
const ImageModal = ({ url, title, onClose }) => {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="va-img-overlay" onClick={onClose}>
      <div className="va-img-box" onClick={e => e.stopPropagation()}>
        <div className="va-img-title">{title}</div>
        <img src={url} alt={title} />
        <button className="va-btn va-btn-ghost va-btn-sm" onClick={onClose}><CloseIcon /> Close</button>
      </div>
    </div>
  );
};

// ── Edit Price modal ──────────────────────────────────────────────────────────
const PriceModal = ({ item, onSave, onCancel, saving }) => {
  const [val, setVal] = useState(item.price);
  return (
    <div className="va-overlay" onClick={onCancel}>
      <div className="va-dialog" onClick={e => e.stopPropagation()}>
        <div className="va-dialog-hd">
          <span>💰 Edit Price</span>
          <button className="va-icon-close" onClick={onCancel}><CloseIcon/></button>
        </div>
        <p className="va-dialog-sub">Update coins for <strong>{item.name}</strong></p>
        <input
          type="number" min="0"
          className="va-finput"
          value={val}
          onChange={e => setVal(e.target.value)}
          autoFocus
        />
        <div className="va-dialog-actions">
          <button className="va-btn va-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="va-btn va-btn-gold" onClick={() => onSave(parseInt(val))} disabled={saving}>
            {saving ? <Spinner sm /> : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Confirm delete modal ──────────────────────────────────────────────────────
const ConfirmModal = ({ name, onConfirm, onCancel, saving }) => (
  <div className="va-overlay" onClick={onCancel}>
    <div className="va-dialog" onClick={e => e.stopPropagation()}>
      <div className="va-dialog-hd danger"><span>🗑 Delete Asset</span><button className="va-icon-close" onClick={onCancel}><CloseIcon/></button></div>
      <p className="va-dialog-sub">Permanently remove <strong>{name}</strong>? This cannot be undone.</p>
      <div className="va-dialog-actions">
        <button className="va-btn va-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="va-btn va-btn-danger" onClick={onConfirm} disabled={saving}>
          {saving ? <Spinner sm /> : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ── Add panel ─────────────────────────────────────────────────────────────────
const AddPanel = ({ onClose, onSuccess, showToast }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);

  const handleFile = (key, e) => {
    const f = e.target.files[0];
    if (f) setFiles(prev => ({ ...prev, [key]: f }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name || !price) { showToast("Name and price are required.", "error"); return; }
    setSaving(true);
    try {
      const Vip = Parse.Object.extend("Vip_assets");
      const obj = new Vip();
      obj.set("name", name.trim());
      obj.set("price", parseInt(price));
      for (const { key } of FILE_FIELDS) {
        if (files[key]) {
          const pf = new Parse.File(files[key].name.replace(/[^A-Za-z0-9_\-.]/g, "_"), files[key]);
          await pf.save();
          obj.set(key, pf);
        }
      }
      await obj.save();
      showToast("VIP asset created!", "success");
      onSuccess();
      onClose();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="va-add-panel">
      <div className="va-add-hd">
        <span className="va-add-title">✦ New VIP Asset</span>
        <button className="va-btn va-btn-ghost va-btn-sm" onClick={onClose}><CloseIcon /> Close</button>
      </div>
      <div className="va-add-body">
        <form onSubmit={handleSubmit}>
          <div className="va-row2">
            <div className="va-fg">
              <label className="va-flabel">Name <span className="va-req">*</span></label>
              <input type="text" className="va-finput" placeholder="e.g. vip1" value={name} onChange={e => setName(e.target.value)} required/>
            </div>
            <div className="va-fg">
              <label className="va-flabel">Price (coins) <span className="va-req">*</span></label>
              <input type="number" className="va-finput" placeholder="e.g. 5000" value={price} onChange={e => setPrice(e.target.value)} required/>
            </div>
          </div>
          <div className="va-section-label">Asset Files</div>
          <div className="va-files-grid">
            {FILE_FIELDS.map(({ key, label, type, icon }) => (
              <div className="va-fg" key={key}>
                <label className="va-flabel">{icon} {label}</label>
                <label className={`va-fdrop ${files[key] ? "has-file" : ""}`}>
                  <input type="file" accept={ACCEPT[type]} onChange={e => handleFile(key, e)} style={{ display: "none" }}/>
                  <span className="va-fdrop-icon">{type === "svga" ? "🎬" : "🖼️"}</span>
                  <span className="va-fdrop-txt">{files[key] ? files[key].name : "Click to upload"}</span>
                  <span className="va-fdrop-ext">{type === "svga" ? ".svga" : ".png .webp .jpg"}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="va-add-footer">
            <button type="submit" className="va-btn va-btn-primary" disabled={saving}>
              {saving ? <Spinner sm /> : <><span>✓</span> Save Asset</>}
            </button>
            <button type="button" className="va-btn va-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Asset item in file grid (card view) ───────────────────────────────────────
const AssetTile = ({ fieldMeta, url, objectId, onReplaced, onImageClick }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleReplace = async e => {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);
    try {
      const query = new Parse.Query("Vip_assets");
      const obj = await query.get(objectId);
      const pf = new Parse.File(f.name.replace(/[^A-Za-z0-9_\-.]/g, "_"), f);
      await pf.save();
      obj.set(fieldMeta.key, pf);
      await obj.save();
      onReplaced();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="va-atile">
      <div className="va-atile-label">
        <span className="va-atile-lbl-txt">{fieldMeta.label}</span>
        <button
          className="va-atile-replace"
          onClick={() => { fileRef.current.value = ""; fileRef.current.click(); }}
          title="Replace file"
        >
          {uploading ? <Spinner sm /> : <UploadIcon />}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT[fieldMeta.type]} onChange={handleReplace} style={{ display: "none" }}/>
      </div>
      <div className="va-atile-prev">
        {url && fieldMeta.type === "image" ? (
          <img
            src={url} alt={fieldMeta.label} loading="lazy"
            onClick={() => onImageClick(url, fieldMeta.label)}
          />
        ) : fieldMeta.type === "svga" ? (
          <div className="va-atile-svga">{url ? "🎬" : "➕"}<span>{url ? "SVGA" : "empty"}</span></div>
        ) : (
          <div className="va-atile-empty">—</div>
        )}
      </div>
    </div>
  );
};

// ── File chip (list view) ─────────────────────────────────────────────────────
const FileChip = ({ fieldMeta, url, objectId, onReplaced, onImageClick }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleReplace = async e => {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);
    try {
      const query = new Parse.Query("Vip_assets");
      const obj = await query.get(objectId);
      const pf = new Parse.File(f.name.replace(/[^A-Za-z0-9_\-.]/g, "_"), f);
      await pf.save();
      obj.set(fieldMeta.key, pf);
      await obj.save();
      onReplaced();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="va-chip" title={fieldMeta.label} onClick={() => { fileRef.current.value = ""; fileRef.current.click(); }}>
      <input ref={fileRef} type="file" accept={ACCEPT[fieldMeta.type]} onChange={handleReplace} style={{ display: "none" }}/>
      <div className="va-chip-thumb">
        {url && fieldMeta.type === "image" ? (
          <img src={url} alt={fieldMeta.label} loading="lazy"
               onClick={e => { e.stopPropagation(); onImageClick(url, fieldMeta.label); }}/>
        ) : fieldMeta.type === "svga" ? (
          <div className="va-chip-svga">{url ? "🎬" : "⬜"}</div>
        ) : (
          <div className="va-chip-empty">—</div>
        )}
      </div>
      <div className="va-chip-hover">{uploading ? <Spinner sm /> : "↑"}</div>
    </div>
  );
};

// ── CARD ──────────────────────────────────────────────────────────────────────
const VipCard = ({ item, idx, onDelete, onEditPrice, onReplaced, onImageClick }) => (
  <div className="va-card" style={{ animationDelay: `${idx * 0.05}s` }}>
    <div className="va-card-hd">
      <div>
        <div className="va-card-name">{item.name}</div>
        <div className="va-card-id">{item.objectId}</div>
      </div>
      <div className="va-price-badge" onClick={() => onEditPrice(item)}>
        💰 {item.price.toLocaleString()}
      </div>
    </div>
    <div className="va-card-body">
      <div className="va-card-date">📅 {item.date}</div>
      <div className="va-assets-grid">
        {FILE_FIELDS.map(f => (
          <AssetTile
            key={f.key}
            fieldMeta={f}
            url={item.files[f.key]}
            objectId={item.objectId}
            onReplaced={onReplaced}
            onImageClick={onImageClick}
          />
        ))}
      </div>
    </div>
    <div className="va-card-ft">
      <button className="va-btn va-btn-gold va-btn-sm" onClick={() => onEditPrice(item)}><EditIcon/> Price</button>
      <button className="va-btn va-btn-danger va-btn-sm" onClick={() => onDelete(item)}><TrashIcon/></button>
    </div>
  </div>
);

// ── ROW ───────────────────────────────────────────────────────────────────────
const VipRow = ({ item, idx, onDelete, onEditPrice, onReplaced, onImageClick }) => (
  <div className="va-row" style={{ animationDelay: `${idx * 0.04}s` }}>
    <div className="va-row-info">
      <div className="va-row-name">{item.name}</div>
      <div className="va-row-id">{item.objectId}</div>
      <div className="va-row-date">{item.date}</div>
    </div>
    <div className="va-price-badge sm" onClick={() => onEditPrice(item)}>💰 {item.price.toLocaleString()}</div>
    <div className="va-row-chips">
      {FILE_FIELDS.map(f => (
        <FileChip
          key={f.key}
          fieldMeta={f}
          url={item.files[f.key]}
          objectId={item.objectId}
          onReplaced={onReplaced}
          onImageClick={onImageClick}
        />
      ))}
    </div>
    <div className="va-row-actions">
      <button className="va-btn va-btn-gold va-btn-sm" onClick={() => onEditPrice(item)}><EditIcon/></button>
      <button className="va-btn va-btn-danger va-btn-sm" onClick={() => onDelete(item)}><TrashIcon/></button>
    </div>
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function VipAssets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem("vipView") || "card");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [imageModal, setImageModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyPrice, setBusyPrice] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const query = new Parse.Query("Vip_assets");
      query.descending("createdAt");
      const results = await query.find();
      setItems(results.map(obj => ({
        objectId: obj.id,
        name: obj.get("name") ?? "—",
        price: parseInt(obj.get("price") ?? 0),
        date: obj.createdAt ? new Date(obj.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
        files: Object.fromEntries(
          FILE_FIELDS.map(({ key }) => [key, obj.get(key) ? obj.get(key).url() : null])
        ),
      })));
    } catch (err) {
      showToast("Failed to load: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const switchView = v => {
    setView(v);
    localStorage.setItem("vipView", v);
  };

  const handleDelete = async () => {
    setBusyDelete(true);
    try {
      const query = new Parse.Query("Vip_assets");
      const obj = await query.get(deleteTarget.objectId);
      await obj.destroy();
      showToast("Asset deleted.");
      fetchItems();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setBusyDelete(false);
      setDeleteTarget(null);
    }
  };

  const handlePrice = async newPrice => {
    setBusyPrice(true);
    try {
      const query = new Parse.Query("Vip_assets");
      const obj = await query.get(priceTarget.objectId);
      obj.set("price", newPrice);
      await obj.save();
      showToast("Price updated!");
      fetchItems();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setBusyPrice(false);
      setPriceTarget(null);
    }
  };

  // stats
  let svgaCount = 0, imgCount = 0;
  items.forEach(item => {
    FILE_FIELDS.forEach(({ key, type }) => {
      if (item.files[key]) { type === "svga" ? svgaCount++ : imgCount++; }
    });
  });

  return (
    <div className="va-wrap">
      <div className="va-bg-glow"/>

      {/* Toast */}
      {toast && <div className={`va-toast va-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Modals */}
      {imageModal && <ImageModal url={imageModal.url} title={imageModal.title} onClose={() => setImageModal(null)}/>}
      {deleteTarget && <ConfirmModal name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} saving={busyDelete}/>}
      {priceTarget && <PriceModal item={priceTarget} onSave={handlePrice} onCancel={() => setPriceTarget(null)} saving={busyPrice}/>}

      {/* Header */}
      <div className="va-header">
        <div className="va-header-l">
          <div className="va-header-icon">👑</div>
          <div>
            <div className="va-title">VIP Assets</div>
            <div className="va-subtitle">Manage VIP tiers · frames · medals · animations</div>
          </div>
        </div>
        <button className="va-btn va-btn-primary" onClick={() => setShowAdd(v => !v)}>
          <PlusIcon/> <span className="va-btn-txt">Add VIP Asset</span>
        </button>
      </div>

      {/* Stats */}
      <div className="va-stats">
        {[
          { val: items.length, lbl: "VIP Tiers" },
          { val: svgaCount,    lbl: "SVGA Files" },
          { val: imgCount,     lbl: "Image Assets" },
          { val: svgaCount + imgCount, lbl: "Total Files" },
        ].map(s => (
          <div className="va-stat" key={s.lbl}>
            <div className="va-stat-val">{s.val}</div>
            <div className="va-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Add panel */}
      {showAdd && (
        <AddPanel
          onClose={() => setShowAdd(false)}
          onSuccess={fetchItems}
          showToast={showToast}
        />
      )}

      {/* Toolbar */}
      <div className="va-toolbar">
        <span className="va-count">{items.length} asset{items.length !== 1 ? "s" : ""}</span>
        <div className="va-toggle">
          <button className={`va-t-btn ${view === "card" ? "active" : ""}`} onClick={() => switchView("card")} title="Card view"><GridIcon/></button>
          <button className={`va-t-btn ${view === "list" ? "active" : ""}`} onClick={() => switchView("list")} title="List view"><ListIcon/></button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="va-loading"><Spinner/><p>Loading VIP assets…</p></div>
      ) : items.length === 0 ? (
        <div className="va-empty">
          <div className="va-empty-icon">👑</div>
          <div className="va-empty-title">No VIP Assets Yet</div>
          <p>Click "Add VIP Asset" to get started.</p>
        </div>
      ) : view === "card" ? (
        <div className="va-card-grid">
          {items.map((item, i) => (
            <VipCard
              key={item.objectId} item={item} idx={i}
              onDelete={setDeleteTarget}
              onEditPrice={setPriceTarget}
              onReplaced={fetchItems}
              onImageClick={(url, title) => setImageModal({ url, title })}
            />
          ))}
        </div>
      ) : (
        <div className="va-list">
          {items.map((item, i) => (
            <VipRow
              key={item.objectId} item={item} idx={i}
              onDelete={setDeleteTarget}
              onEditPrice={setPriceTarget}
              onReplaced={fetchItems}
              onImageClick={(url, title) => setImageModal({ url, title })}
            />
          ))}
        </div>
      )}
    </div>
  );
}