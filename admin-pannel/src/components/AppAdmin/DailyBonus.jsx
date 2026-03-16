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
    avatarName: "",
    avatarImage: "",
    effectName: "",
    effectPreview: "",
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
        coins: item.coins ?? "",
        avatarName: item.avatarName ?? "",
        avatarImage: item.avatarImage ?? "",
        effectName: item.effectName ?? "",
        effectPreview: item.effectPreview ?? "",
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

    const filteredData = data.filter((item) =>
      item.objectId.toLowerCase().includes(value)
    );

    setFiltered(filteredData);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAdd = () => {
    setEditItem(null);

    setForm({
      day: "",
      rewardType: "Coin",
      coins: "",
      avatarName: "",
      avatarImage: "",
      effectName: "",
      effectPreview: "",
    });

    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);

    setForm({
      day: item.day,
      rewardType: item.rewardType,
      coins: item.coins,
      avatarName: item.avatarName,
      avatarImage: item.avatarImage,
      effectName: item.effectName,
      effectPreview: item.effectPreview,
    });

    setShowModal(true);
  };

  const saveBonus = async () => {
      const payload = {
      day: Number(form.day),
      rewardType: form.rewardType,

      coins: form.rewardType === "Coin" ? String(form.coins) : "",

      avatarName:
        form.rewardType === "Avatar Frame" ? form.avatarName : "",

      avatarImage:
        form.rewardType === "Avatar Frame" ? form.avatarImage : "",

      effectName:
        form.rewardType === "Entrance Effect" ? form.effectName : "",

      effectPreview:
        form.rewardType === "Entrance Effect" ? form.effectPreview : "",
    };

    try {
      let res;

      if (editItem) {
        res = await fetch(
          `${SERVER_URL}/classes/DailyBonus/${editItem.objectId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          }
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
        alert(json.error);
        return;
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteBonus = async (item) => {
    if (!window.confirm("Delete this reward?")) return;

    try {
      await fetch(
        `${SERVER_URL}/classes/DailyBonus/${item.objectId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      fetchData();
    } catch (err) {
      alert(err.message);
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
          placeholder="Search ObjectId"
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
              <th>Avatar</th>
              <th>Effect</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Loading...</td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan="7">No Rewards</td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr key={item.objectId}>
                  <td>{item.day}</td>
                  <td>{item.rewardType}</td>
                  <td>{item.coins}</td>
                  <td>{item.avatarName}</td>
                  <td>{item.effectName}</td>
                  <td>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>

                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => openEdit(item)}
                    >
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
          <button
            disabled={page === 0}
            onClick={() => changePage(page - 1)}
          >
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

            <div className="form-group">
              <label>Day</label>
              <input
                name="day"
                value={form.day}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Reward Type</label>
              <select
                name="rewardType"
                value={form.rewardType}
                onChange={handleChange}
              >
                <option value="Coin">Coin</option>
                <option value="Avatar Frame">Avatar Frame</option>
                <option value="Entrance Effect">
                  Entrance Effect
                </option>
              </select>
            </div>

            {form.rewardType === "Coin" && (
              <div className="form-group">
                <label>Coins</label>
                <input
                  name="coins"
                  value={form.coins}
                  onChange={handleChange}
                />
              </div>
            )}

            {form.rewardType === "Avatar Frame" && (
              <>
                <div className="form-group">
                  <label>Avatar Name</label>
                  <input
                    name="avatarName"
                    value={form.avatarName}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Avatar Image URL</label>
                  <input
                    name="avatarImage"
                    value={form.avatarImage}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {form.rewardType === "Entrance Effect" && (
              <>
                <div className="form-group">
                  <label>Effect Name</label>
                  <input
                    name="effectName"
                    value={form.effectName}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Effect Preview URL</label>
                  <input
                    name="effectPreview"
                    value={form.effectPreview}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div className="modal-actions">
              <button onClick={saveBonus}>Save</button>
              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}