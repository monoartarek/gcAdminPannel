import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Parse from "../../parseConfig";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./GiftCoin.css";

const PAGE_SIZE = 20;

// ───────── HELPERS ─────────
const safeGet = (obj, key, fallback = null) => {
  try { return obj?.get?.(key) ?? fallback; } catch { return fallback; }
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString() : "";

const mapRecord = (r) => {
  const author = safeGet(r, "author");
  const receiver = safeGet(r, "receiver");

  const mapUser = (u, fallbackUid) => ({
    name: safeGet(u, "name") || "User",
    uid: safeGet(u, "uid") || fallbackUid || "—",
    email: safeGet(u, "email") || "—",
    avatar: safeGet(u, "avatar")?.url?.() || null,
  });

  return {
    id: r.id,
    diamonds: safeGet(r, "diamondsQuantity") || 0,
    giftName: safeGet(r, "giftName") || "Gift",
    giftUrl: safeGet(r, "giftFileUrl"),
    createdAt: r.createdAt,
    author: mapUser(author, safeGet(r, "authorId")),
    receiver: mapUser(receiver, safeGet(r, "receiverId")),
  };
};

// ───────── COMPONENT ─────────
export default function GiftHistory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [uid, setUid] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const debounceRef = useRef();

  // ───────── QUERY ─────────
  const buildQuery = useCallback(() => {
    const GiftsSent = Parse.Object.extend("GiftsSent");
    const q = new Parse.Query(GiftsSent);

    // ✅ UID SEARCH
    if (uid.trim()) {
      const num = Number(uid.trim());
      if (!isNaN(num)) {
        const userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("uid", num);
        q.matchesQuery("author", userQuery);
      }
    }

    // ✅ DATE FILTER
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      q.greaterThanOrEqualTo("createdAt", s);
    }

    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      q.lessThanOrEqualTo("createdAt", e);
    }

    q.include("author");
    q.include("receiver");
    q.descending("createdAt");

    return q;
  }, [uid, startDate, endDate]);

  // ───────── FETCH ─────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery();
      q.limit(PAGE_SIZE);
      q.skip(page * PAGE_SIZE);

      const [res, count] = await Promise.all([
        q.find({ useMasterKey: true }),
        q.count({ useMasterKey: true }),
      ]);

      setData(res.map(mapRecord));
      setTotalCount(count);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [buildQuery, page]);

  useEffect(() => {
    fetchData();
  }, [page]);

  // ───────── SEARCH ─────────
  const handleSearch = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      fetchData();
    }, 300);
  };

  // ───────── EXPORT PDF ─────────
  const exportPDF = async () => {
    const q = buildQuery();
    q.limit(10000);
    const res = await q.find({ useMasterKey: true });
    const all = res.map(mapRecord);

    const doc = new jsPDF("landscape");

    doc.text("Gift Report", 14, 10);

    doc.autoTable({
      head: [["Date", "Sender", "UID", "Receiver", "UID", "Gift", "Diamonds"]],
      body: all.map(i => [
        fmtDate(i.createdAt),
        i.author.name,
        i.author.uid,
        i.receiver.name,
        i.receiver.uid,
        i.giftName,
        i.diamonds,
      ])
    });

    doc.save("gift_report.pdf");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="gh-root">

      {/* HEADER */}
      <div className="gh-header">
        <h2>Gift History</h2>
        <button onClick={exportPDF}>Export PDF</button>
      </div>

      {/* FILTER */}
      <div className="gh-filter">
        <input
          placeholder="Search by UID"
          value={uid}
          onChange={e => setUid(e.target.value)}
        />
        <input type="date" onChange={e => setStartDate(e.target.value)} />
        <input type="date" onChange={e => setEndDate(e.target.value)} />

        <button onClick={handleSearch}>Search</button>
      </div>

      {/* TABLE */}
      <div className="gh-table-wrap">
        {loading ? <p>Loading...</p> : (
          <table className="gh-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Gift</th>
                <th>Diamonds</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="gh-user">
                      <img src={item.author.avatar || "/logo.png"} />
                      <div>
                        <strong>{item.author.name}</strong>
                        <span>UID: {item.author.uid}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="gh-user">
                      <img src={item.receiver.avatar || "/logo.png"} />
                      <div>
                        <strong>{item.receiver.name}</strong>
                        <span>UID: {item.receiver.uid}</span>
                      </div>
                    </div>
                  </td>

                  <td>{item.giftName}</td>
                  <td>💎 {item.diamonds}</td>
                  <td>{fmtDate(item.createdAt)} {fmtTime(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      <div className="gh-pagination">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>{page + 1} / {totalPages}</span>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>

    </div>
  );
}