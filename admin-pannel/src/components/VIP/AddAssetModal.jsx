import React, { useState } from 'react';
import Parse from "../../parseConfig";

const AddNewAssets = ({ onAssetAdded }) => {
    const [formData, setFormData] = useState({ name: '', price: '' });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const VIPAsset = Parse.Object.extend("VIPAsset");
            const asset = new VIPAsset();

            if (file) {
                const parseFile = new Parse.File(file.name, file);
                await parseFile.save();
                asset.set("image", parseFile);
            }

            asset.set("name", formData.name);
            asset.set("price", parseInt(formData.price));

            await asset.save();
            onAssetAdded();
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form className="add-panel card animate-fade-in" onSubmit={handleSubmit}>
            <div className="form-group">
                <input 
                    type="text" placeholder="Asset Name (e.g. VIP 1)" required 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                <input 
                    type="number" placeholder="Price" required 
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} 
                />
                <input type="file" onChange={handleFileChange} accept="image/*" />
            </div>
            
            {preview && <img src={preview} alt="Preview" className="upload-preview" />}
            
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Uploading...' : 'Save VIP Asset'}
            </button>
        </form>
    );
};

export default AddNewAssets;