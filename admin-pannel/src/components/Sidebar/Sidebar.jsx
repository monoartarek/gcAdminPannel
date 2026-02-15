import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const [openSub, setOpenSub] = useState(null);

  // Full structured menu with paths
  const menu = [
    { title: 'Dashboard', icon: '🏠', path: '/' },
    { title: 'Market Coins', icon: '🪙', path: '/market-coins' },

    {
      title: 'Manager',
      icon: '🛡️',
      sub: [
        { label: 'Make/Remove Manager', path: '/manager/create' },
        { label: 'All Managers', path: '/manager/all' }
      ]
    },

    {
      title: 'Reseller',
      icon: '🤝',
      sub: [
        { label: 'Make/Remove Reseller', path: '/reseller/create' },
        { label: 'All Resellers', path: '/reseller/all' }
      ]
    },

    {
      title: 'Users',
      icon: '👤',
      sub: [
        { label: 'All Users', path: '/users/all' },
        { label: 'Blocked Users', path: '/users/blocked' }
      ]
    },

    {
      title: 'HOST/Agency',
      icon: '🏢',
      sub: [
        { label: 'All Earning', path: '/host/earning' },
        { label: 'All Agency', path: '/host/agency' },
        { label: 'All Agency History', path: '/host/history' }
      ]
    },

    {
      title: 'App Admin',
      icon: '⚙️',
      sub: [
        { label: 'Make App Admin', path: '/app-admin/create' },
        { label: 'Just Admins', path: '/app-admin/list' },
        { label: 'Daily Bonus', path: '/app-admin/daily-bonus' }
      ]
    },

    { title: 'Rocket', icon: '🚀', path: '/rocket' },
    { title: 'Messages', icon: '📩', path: '/messages' },
    { title: 'Posts', icon: '📝', path: '/posts' },
    { title: 'Comments', icon: '💬', path: '/comments' },
    { title: 'Banner Image', icon: '🖼️', path: '/banner-image' },
    { title: 'Splash Banner', icon: '⚡', path: '/splash-banner' },
    { title: 'Live Bonus', icon: '🎁', path: '/live-bonus' },
    { title: 'Live Streams', icon: '🎥', path: '/live-streams' },
    { title: 'Top Streams', icon: '🔥', path: '/top-streams' },
    { title: 'Stories', icon: '📱', path: '/stories' },

    {
      title: 'Gifts',
      icon: '🧧',
      sub: [
        { label: 'All Gifts', path: '/gifts/all' },
        { label: 'Add New Gift', path: '/gifts/add' }
      ]
    },

    {
      title: 'VIP',
      icon: '💎',
      sub: [
        { label: 'All Assets', path: '/vip/all' },
        { label: 'Add New Assets', path: '/vip/add' }
      ]
    },

    {
      title: 'Avatar Frame',
      icon: '🖼️',
      sub: [
        { label: 'All Avatar Frame', path: '/avatar/all' },
        { label: 'Add New Avatar Frame', path: '/avatar/add' }
      ]
    },

    {
      title: 'Party Theme',
      icon: '🎉',
      sub: [
        { label: 'All Party Themes', path: '/party/all' },
        { label: 'Add New Party Theme', path: '/party/add' }
      ]
    },

    {
      title: 'Entrance Effect',
      icon: '✨',
      sub: [
        { label: 'All Entrance Effects', path: '/entrance/all' },
        { label: 'Add New Entrance Effects', path: '/entrance/add' }
      ]
    },

    {
      title: 'Official Announcement',
      icon: '📢',
      sub: [
        { label: 'All Announcements', path: '/announcement/all' },
        { label: 'Add New Announcement', path: '/announcement/add' }
      ]
    },

    { title: 'Game History', icon: '🎮', path: '/game-history' },
    { title: 'Agora Settings', icon: '🔧', path: '/agora-settings' },
    { title: 'Payments', icon: '💳', path: '/payments' },

    {
      title: 'Payouts',
      icon: '💰',
      sub: [
        { label: 'All Payouts', path: '/payouts/all' },
        { label: 'Pending', path: '/payouts/pending' },
        { label: 'Processing', path: '/payouts/processing' }
      ]
    },

    { title: 'Reports', icon: '📊', path: '/reports' },

    {
      title: 'Advertising',
      icon: '📺',
      sub: [
        { label: 'My Ads', path: '/ads/my' },
        { label: 'Create New Ad', path: '/ads/create' },
        { label: 'Google Admob', path: '/ads/admob' }
      ]
    }
  ];

  const handleToggleSub = (title) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenSub(title);
    } else {
      setOpenSub(openSub === title ? null : title);
    }
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'show' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-controls">
          <button
            className="arrow-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menu.map(item => (
            <div key={item.title} className="menu-block">

              {/* Main Item without submenu */}
              {!item.sub && (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                >
                  <span className="icon">{item.icon}</span>
                  {!isCollapsed && <span className="label">{item.title}</span>}
                </NavLink>
              )}

              {/* Item with submenu */}
              {item.sub && (
                <>
                  <div
                    className={`menu-item ${openSub === item.title ? 'active' : ''}`}
                    onClick={() => handleToggleSub(item.title)}
                  >
                    <span className="icon">{item.icon}</span>
                    {!isCollapsed && <span className="label">{item.title}</span>}
                    {!isCollapsed && (
                      <span className="chevron">{openSub === item.title ? '▾' : '▸'}</span>
                    )}
                  </div>

                  {openSub === item.title && !isCollapsed && (
                    <div className="submenu">
                      {item.sub.map(subItem => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          className={({ isActive }) => `sub-item ${isActive ? 'active' : ''}`}
                        >
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
