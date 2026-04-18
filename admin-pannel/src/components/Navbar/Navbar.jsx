import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Parse from "../../parseConfig";
import { Menu, X, LayoutDashboard, Terminal } from "lucide-react";
import "./Navbar.css";

function Navbar({ onHamburgerClick }) {
  const [user, setUser] = useState(null);
  const [visitedHistory, setVisitedHistory] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await Parse.User.currentAsync();
      if (currentUser) setUser(currentUser);
    };
    loadUser();
  }, []);

  // Auto-scroll to the right whenever history updates or location changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [visitedHistory, location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/login") return;

    setVisitedHistory((prev) => {
      if (prev.find((item) => item.path === path)) return prev;
      const name = path.substring(1).charAt(0).toUpperCase() + path.slice(2);
      return [...prev, { name, path }];
    });
  }, [location]);

  const removeHistoryItem = (e, pathToRemove) => {
    e.stopPropagation();
    setVisitedHistory((prev) => prev.filter((item) => item.path !== pathToRemove));
  };

  return (
    <nav className="priyu-nav-container">
      <div className="priyu-nav-left-group">
        <button className="priyu-nav-mobile-toggle" onClick={onHamburgerClick}>
          <Menu size={20} />
        </button>

        <div className="priyu-nav-brand-box" onClick={() => navigate("/")}>
          <div className="priyu-brand-icon">
            <Terminal size={18} color="#fff" />
          </div>
          <div className="priyu-brand-text">
            <span className="brand-main">Priyu</span>
            <span className="brand-sub">Live</span>
          </div>
        </div>

        <div className="priyu-nav-history-viewport" ref={scrollRef}>
          {visitedHistory.map((item) => (
            <div 
              key={item.path} 
              className={`priyu-history-tab ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <LayoutDashboard size={12} className="tab-icon" />
              <span>{item.name}</span>
              <X 
                size={12} 
                className="tab-close" 
                onClick={(e) => removeHistoryItem(e, item.path)} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="priyu-nav-right-group">
        {user && (
          <div className="priyu-nav-profile-pill" onClick={() => navigate("/profile")}>
            <div className="priyu-nav-user-info">
              <p className="priyu-nav-username">{user.getUsername()}</p>
              <p className="priyu-nav-role">{user.get("role") || "Admin"}</p>
            </div>
            <div className="priyu-nav-avatar-box">
              <img src="/logo.png" alt="Profile" className="priyu-nav-avatar-img" />
              <div className="priyu-nav-status-dot"></div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;