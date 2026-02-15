import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';

import Dashboard from './Pages/Dashboard';
import MarketCoins from './Pages/MarketCoins';
import AllUsers from './Pages/AllUsers';
import BlockedUsers from './Pages/BlockedUsers';
import AllManagers from './Pages/AllManagers';
import MakeManager from './Pages/MakeManager';

import './App.css';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-wrapper">

      <Navbar onHamburgerClick={() => setIsMobileOpen(!isMobileOpen)} />

      <div className={`layout-body ${isCollapsed ? 'collapsed' : ''}`}>

        <Sidebar 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="main-content">
          <div className="content-container">

            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/market-coins" element={<MarketCoins />} />

              <Route path="/users/all" element={<AllUsers />} />
              <Route path="/users/blocked" element={<BlockedUsers />} />

              <Route path="/managers/all" element={<AllManagers />} />
              <Route path="/managers/create" element={<MakeManager />} />
            </Routes>

          </div>
        </main>

      </div>
    </div>
  );
}

export default App;
