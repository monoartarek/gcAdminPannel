import React, { useEffect, useState } from "react";
import "./Navbar.css";
import Parse from "../../parseConfig";
import { useNavigate } from "react-router-dom";

function Navbar({ onHamburgerClick }) {

  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {

    const loadUser = async () => {

      const currentUser = await Parse.User.currentAsync();

      if (currentUser) {
        setUser(currentUser);
      }

    };

    loadUser();

  }, []);


  const goProfile = () => {

    navigate("/profile");

  };


  return (

    <nav className="main-navbar">

      <div className="nav-section left">

        <button
          className="mobile-btn"
          onClick={onHamburgerClick}
        >
          ☰
        </button>

        <div className="brand-logo">
          Priyu Live
        </div>

      </div>


      <div className="nav-section middle">

        <span className="admin-tag">
          {/* ADMIN PANE */}
        </span>

      </div>


      <div className="nav-section right">

        {user && (

          <div
            className="profile-pill"
            onClick={goProfile}
          >

            <div className="text-right">

              <p className="p-name">
                {user.getUsername()}
              </p>

              <p className="p-role">
                {user.get("role")}
              </p>

            </div>

            <div className="p-avatar">

              {user.getUsername().charAt(0).toUpperCase()}

            </div>

          </div>

        )}

      </div>

    </nav>

  );

}

export default Navbar;