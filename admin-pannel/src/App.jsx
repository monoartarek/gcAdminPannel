import React, { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import './App.css';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-wrapper">
      {/* Navbar stays at the very top*/}
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
            <h1>Dashboard Overview</h1>
            <p>Your analytics and management tools are ready.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;