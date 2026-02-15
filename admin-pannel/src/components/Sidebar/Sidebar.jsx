import React, { useState } from 'react';
import './Sidebar.css';

function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const [openSub, setOpenSub] = useState(null);

  // Structured menu data for high scalability
  const menu = [
    { title: 'Dashboard', icon: '🏠' },
    { title: 'Market Coins', icon: '🪙' },
    { 
      title: 'Manager', 
      icon: '🛡️', 
      sub: ['Make/Remove Manager', 'All Managers'] 
    },
    { 
      title: 'Reseller', 
      icon: '🤝', 
      sub: ['Make/Remove Reseller', 'All Resellers'] 
    },
    { 
      title: 'Users', 
      icon: '👤', 
      sub: ['All Users', 'Blocked Users'] 
    },
    { 
      title: 'HOST/Agency', 
      icon: '🏢', 
      sub: ['All Earning', 'All Agency', 'All Agency History'] 
    },
    { 
      title: 'App Admin', 
      icon: '⚙️', 
      sub: ['Make App Admin', 'Just Admins', 'Daily Bonus'] 
    },
    { title: 'Rocket', icon: '🚀' },
    { title: 'Messages', icon: '📩' },
    { title: 'Posts', icon: '📝' },
    { title: 'Comments', icon: '💬' },
    { title: 'Banner Image', icon: '🖼️' },
    { title: 'Splash Banner', icon: '⚡' },
    { title: 'Live Bonus', icon: '🎁' },
    { title: 'Live Streams', icon: '🎥' },
    { title: 'Top Streams', icon: '🔥' },
    { title: 'Stories', icon: '📱' },
    { 
      title: 'Gifts', 
      icon: '🧧', 
      sub: ['All Gifts', 'Add New Gift'] 
    },
    { 
      title: 'VIP', 
      icon: '💎', 
      sub: ['All Assets', 'Add New Assets'] 
    },
    { 
      title: 'Avatar Frame', 
      icon: '🖼️', 
      sub: ['All Avatar Frame', 'Add New Avatar Frame'] 
    },
    { 
      title: 'Party Theme', 
      icon: '🎉', 
      sub: ['All Party Themes', 'Add New Party Theme'] 
    },
    { 
      title: 'Entrance Effect', 
      icon: '✨', 
      sub: ['All Entrance Effects', 'Add New Entrance Effects'] 
    },
    { 
      title: 'Official Announcement', 
      icon: '📢', 
      sub: ['All Announcements', 'Add New Announcement'] 
    },
    { title: 'Game History', icon: '🎮' },
    { title: 'Agora Settings', icon: '🔧' },
    { title: 'Payments', icon: '💳' },
    { 
      title: 'Payouts', 
      icon: '💰', 
      sub: ['All Payouts', 'Pending', 'Processing'] 
    },
    { title: 'Reports', icon: '📊' },
    { 
      title: 'Advertising', 
      icon: '📺', 
      sub: ['My Ads', 'Create New Ad', 'Google Admob'] 
    },
  ];

  const handleToggleSub = (title) => {
    // If sidebar is collapsed, clicking an item should expand the sidebar first
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenSub(title);
    } else {
      setOpenSub(openSub === title ? null : title);
    }
  };

  return (
    <>
      {/* Mobile Backdrop - Blurs the background when sidebar is open on phones */}
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
          {menu.map((item) => (
            <div key={item.title} className="menu-block">
              <div 
                className={`menu-item ${openSub === item.title ? 'active' : ''}`}
                onClick={() => item.sub ? handleToggleSub(item.title) : null}
              >
                <span className="icon">{item.icon}</span>
                {!isCollapsed && <span className="label">{item.title}</span>}
                {!isCollapsed && item.sub && (
                  <span className="chevron">
                    {openSub === item.title ? '▾' : '▸'}
                  </span>
                )}
              </div>

              {/* Submenu Logic: Only show if item has sub-links and sidebar is expanded */}
              {item.sub && openSub === item.title && !isCollapsed && (
                <div className="submenu">
                  {item.sub.map((subItem) => (
                    <div key={subItem} className="sub-item">
                      {subItem}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;