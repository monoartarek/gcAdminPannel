import React, { useState, useEffect } from 'react';
import Parse from "../../parseConfig";
import AddAssetModal from './AddAssetModal';
import './Vip.css';

// --- MAIN DASHBOARD COMPONENT ---
export default function VipAssetsDashboard() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(localStorage.getItem('vip_view_mode') || 'grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchAssets();
    localStorage.setItem('vip_view_mode', viewMode);
  }, [viewMode]);

  const fetchAssets = async () => {
    setLoading(true);
    const query = new Parse.Query("Vip_assets");
    query.descending("createdAt");
    try {
      const results = await query.find();
      setAssets(results);
    } catch (error) {
      console.error("Error fetching assets", error);
    }
    setLoading(false);
  };

  const handleDelete = async (objectId) => {
    if (window.confirm("Are you sure you want to delete this VIP asset?")) {
      const obj = new Parse.Object("Vip_assets");
      obj.id = objectId;
      await obj.destroy();
      setAssets(assets.filter(a => a.id !== objectId));
    }
  };

  const handleUpdatePrice = async (objectId, currentPrice) => {
    const newPrice = prompt("Enter new price:", currentPrice);
    if (newPrice && !isNaN(newPrice)) {
      const obj = new Parse.Object("Vip_assets");
      obj.id = objectId;
      obj.set("price", Number(newPrice));
      await obj.save();
      fetchAssets();
    }
  };

  return (
    <div className="vip-dashboard">
      <Header 
        count={assets.length} 
        onAdd={() => setIsAddModalOpen(true)} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
      />

      <StatsCards assets={assets} />

      {loading ? (
        <div className="loader-container"><div className="spinner"></div></div>
      ) : (
        <div className={viewMode === 'grid' ? 'assets-grid' : 'assets-list'}>
          {assets.map(asset => (
            viewMode === 'grid' ? (
              <AssetCard 
                key={asset.id} 
                asset={asset} 
                onDelete={handleDelete} 
                onEditPrice={handleUpdatePrice}
                onPreview={setPreviewImage}
              />
            ) : (
              <AssetRow 
                key={asset.id} 
                asset={asset} 
                onDelete={handleDelete} 
                onEditPrice={handleUpdatePrice}
              />
            )
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddAssetModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => { setIsAddModalOpen(false); fetchAssets(); }} 
        />
      )}

      {previewImage && (
        <div className="image-modal" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Full Preview" />
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

const Header = ({ count, onAdd, viewMode, setViewMode }) => (
  <header className="vip-header">
    <div className="header-left">
      <h1>VIP Assets <span className="badge">{count}</span></h1>
      <p>Manage premium frames, medals, and entrance effects.</p>
    </div>
    <div className="header-actions">
      <div className="view-toggle">
        <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
      </div>
      <button className="btn-primary" onClick={onAdd}>+ Add VIP Asset</button>
    </div>
  </header>
);

const StatsCards = ({ assets }) => {
  const totalValue = assets.reduce((sum, a) => sum + (a.get('price') || 0), 0);
  return (
    <div className="stats-grid">
      <div className="stat-card"><span>Total Assets</span><h3>{assets.length}</h3></div>
      <div className="stat-card"><span>Total Value</span><h3>{totalValue.toLocaleString()}</h3></div>
      <div className="stat-card"><span>Status</span><h3>Active</h3></div>
    </div>
  );
};

const AssetCard = ({ asset, onDelete, onEditPrice, onPreview }) => {
  const mainImg = asset.get('frame_image')?.url();
  
  return (
    <div className="asset-card card-anim">
      <div className="card-image-box" onClick={() => onPreview(mainImg)}>
        {mainImg ? <img src={mainImg} alt="Frame" /> : <div className="svga-placeholder">SVGA</div>}
        <div className="card-price">${asset.get('price')}</div>
      </div>
      <div className="card-content">
        <h3>{asset.get('name')}</h3>
        <p>ID: {asset.id}</p>
        <div className="card-footer">
          <button className="btn-icon" onClick={() => onEditPrice(asset.id, asset.get('price'))}>Edit Price</button>
          <button className="btn-icon delete" onClick={() => onDelete(asset.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
};

const AssetRow = ({ asset, onDelete, onEditPrice }) => (
  <div className="asset-row card-anim">
    <img src={asset.get('frame_image')?.url()} alt="" className="row-thumb" />
    <div className="row-info">
      <strong>{asset.get('name')}</strong>
      <span>{asset.id}</span>
    </div>
    <div className="row-price">${asset.get('price')}</div>
    <div className="row-actions">
      <button onClick={() => onEditPrice(asset.id, asset.get('price'))}>Price</button>
      <button onClick={() => onDelete(asset.id)} className="delete">Delete</button>
    </div>
  </div>
);