import React, { useEffect, useState } from "react";
import "./DailyBonus.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
  "Content-Type": "application/json",
};

const PAGE_SIZE = 10;

export default function DailyBonus() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    day: "",
    rewardType: "Coin",
    coins: "",
    gift: "",
    preview: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SERVER_URL}/classes/DailyBonus?limit=1000&order=day`,
        { headers }
      );
      const json = await res.json();
      const results = (json.results || []).map((item) => ({
        objectId: item.objectId,
        day: item.day ?? "",
        rewardType: item.rewardType ?? "",
        coins: item.coins ?? 0,
        gift: item.gift ?? "",
        preview: item.preview ?? "",
        updatedAt: item.updatedAt,
      }));
      setData(results);
      setFiltered(results);
    } catch (err) {
      alert("Fetch error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    setPage(0);
    if (!value.trim()) {
      setFiltered(data);
      return;
    }
    setFiltered(
      data.filter((item) => item.objectId.toLowerCase().includes(value))
    );
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const changePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ day: "", rewardType: "Coin", coins: "", gift: "", preview: "" });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      day: item.day,
      rewardType: item.rewardType,
      coins: item.coins,
      gift: item.gift,
      preview: item.preview,
    });
    setShowModal(true);
  };

  const saveBonus = async () => {
    const payload = {
      day: Number(form.day),
      rewardType: form.rewardType,
      coins: String(form.coins) || 0,
      gift: form.gift,
      preview: form.preview,
    };

    try {
      let res;

      if (editItem) {
        res = await fetch(
          `${SERVER_URL}/classes/DailyBonus/${editItem.objectId}`,
          { method: "PUT", headers, body: JSON.stringify(payload) }
        );
      } else {
        res = await fetch(`${SERVER_URL}/classes/DailyBonus`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();

      if (!res.ok || json.error) {
        alert(`Server error: ${json.error || res.statusText}`);
        return;
      }

      setShowModal(false);
      setPage(0);
      fetchData();
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const deleteBonus = async (item) => {
    if (!window.confirm("Delete this reward?")) return;

    try {
      const res = await fetch(
        `${SERVER_URL}/classes/DailyBonus/${item.objectId}`,
        { method: "DELETE", headers }
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        alert(`Delete error: ${json.error || res.statusText}`);
        return;
      }
      fetchData();
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  return (
    <div className="dailybonus-page">
      <h2 className="page-title">Daily Bonus Rewards</h2>

      <div className="top-bar">
        <button className="add-btn" onClick={openAdd}>
          Add Daily Bonus
        </button>
        <input
          type="text"
          placeholder="Search by ObjectId..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table className="bonus-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Reward Type</th>
              <th>Coins</th>
              <th>Gift</th>
              <th>Preview</th>
              <th>Object ID</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="center">
                  Loading...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan="8" className="center">
                  No Rewards
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr key={item.objectId}>
                  <td data-label="Day">{item.day}</td>
                  <td data-label="Reward Type">{item.rewardType}</td>
                  <td data-label="Coins">{item.coins}</td>
                  <td data-label="Gift">{item.gift}</td>
                  <td data-label="Preview">
                    <img
                      src={item.preview || "https://via.placeholder.com/40"}
                      className="preview"
                      alt="preview"
                    />
                  </td>
                  <td data-label="Object ID">{item.objectId}</td>
                  <td data-label="Updated">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td data-label="Actions">
                    <button className="edit-btn" onClick={() => openEdit(item)}>
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteBonus(item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => changePage(page - 1)}>
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => changePage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page === totalPages - 1}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editItem ? "Edit Reward" : "Add Reward"}</h3>

            <input
              name="day"
              placeholder="Day"
              value={form.day}
              onChange={handleChange}
            />

            <select
              name="rewardType"
              value={form.rewardType}
              onChange={handleChange}
            >
              <option value="Coin">Coin</option>
              <option value="Avatar Frame">Avatar Frame</option>
              <option value="Entrance Effect">Entrance Effect</option>
            </select>

            <input
              name="coins"
              placeholder="Coins"
              value={form.coins}
              onChange={handleChange}
            />

            <input
              name="gift"
              placeholder="Gift"
              value={form.gift}
              onChange={handleChange}
            />

            <input
              name="preview"
              placeholder="Preview Image URL"
              value={form.preview}
              onChange={handleChange}
            />

            <div className="modal-actions">
              <button onClick={saveBonus}>Save</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}