import React, { useEffect, useState } from "react";
import "./SplashBanner.css";
import Parse from "../../parseConfig";

const PAGE_SIZE = 50;

export default function SplashBanner() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ FETCH DATA
  const fetchData = async () => {
    try {
      setLoading(true);

      const Banner = Parse.Object.extend("SplashBanner");
      const query = new Parse.Query(Banner);
      query.descending("createdAt");

      const results = await query.find();

      const list = results.map((item) => ({
        id: item.id,
        image: item.get("image")?.url() || null,
      }));

      setData(list);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FILE SELECT
  const handleFile = (e) => {
    const selected = e.target.files[0];
    setFile(selected);

    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  };

  // ✅ UPLOAD / CREATE
  const handleUpload = async () => {
    if (!file) {
      alert("Please select image");
      return;
    }

    try {
      setLoading(true);

      const Banner = Parse.Object.extend("SplashBanner");

      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();

      const obj = new Banner();
      obj.set("image", parseFile);

      await obj.save();

      alert("Uploaded Successfully ✅");

      resetForm();
      fetchData();
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Upload failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ EDIT CLICK
  const handleEditClick = (item) => {
    setEditingId(item.id);
    setPreview(item.image);
    setFile(null);
  };

  // ✅ UPDATE
  const handleUpdate = async () => {
    if (!editingId) return;

    try {
      setLoading(true);

      const Banner = Parse.Object.extend("SplashBanner");
      const query = new Parse.Query(Banner);

      const obj = await query.get(editingId);

      if (file) {
        const parseFile = new Parse.File(file.name, file);
        await parseFile.save();
        obj.set("image", parseFile);
      }

      await obj.save();

      alert("Updated Successfully ✅");

      resetForm();
      fetchData();
    } catch (err) {
      console.error("Update Error:", err);
      alert("Update failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE
  const handleDelete = async (id) => {
    try {
      if (!window.confirm("Delete this banner?")) return;

      setLoading(true);

      const Banner = Parse.Object.extend("SplashBanner");
      const query = new Parse.Query(Banner);

      const obj = await query.get(id);
      await obj.destroy();

      alert("Deleted Successfully ✅");

      fetchData();
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Delete failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ RESET FORM
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setEditingId(null);
  };

  return (
    <div className="container">
      <h2>Splash Banner</h2>

      {/* UPLOAD / EDIT */}
      <div className="upload-box">
        <input type="file" onChange={handleFile} />

        {preview && (
          <img src={preview} alt="preview" className="preview" />
        )}

        {!editingId ? (
          <button onClick={handleUpload} disabled={loading}>
            Upload
          </button>
        ) : (
          <>
            <button onClick={handleUpdate} disabled={loading}>
              Update
            </button>
            <button onClick={resetForm}>Cancel</button>
          </>
        )}
      </div>

      {/* TABLE */}
      <table>
        <thead>
          <tr>
            <th>ObjectId</th>
            <th>Image</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="3">Loading...</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan="3">No Data Found</td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>

                <td>
                  {item.image && (
                    <img src={item.image} className="img" />
                  )}
                </td>

                <td>
                  <button onClick={() => handleEditClick(item)}>
                    Edit
                  </button>

                  <button onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}