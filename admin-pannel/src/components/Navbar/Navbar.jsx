import React from 'react';
import './Navbar.css';

function Navbar({ onHamburgerClick }) {
  return (
    <nav className="main-navbar">
      <div className="nav-section left">
        <button className="mobile-btn" onClick={onHamburgerClick}>☰</button>
        <div className="brand-logo">LOGO</div>
      </div>

      <div className="nav-section middle">
        <span className="admin-tag">ADMIN PANEL</span>
      </div>

      <div className="nav-section right">
        <div className="profile-pill">
          <div className="text-right">
            <p className="p-name">Admin Tarek</p>
            <p className="p-role">Root User</p>
          </div>
          <div className="p-avatar">AA</div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;