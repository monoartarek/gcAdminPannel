import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

//component import 
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';

//pages import 
import Dashboard from './Pages/Dashboard';
import MarketCoins from './Pages/MarketCoins';
import AllUsers from './Pages/AllUsers';
import BlockedUsers from './Pages/BlockedUsers';
import AllManagers from './Pages/AllManagers';
import MakeManager from './Pages/MakeOrRemoveManager';
import MakeReseller from './Pages/MakeReseller';
import AllResellers from './Pages/AllResellers';
import AppadminPage from './Pages/MakeAppAdmin';  
import AllEarnings from './Pages/AllEarnings';
import AllAgencyHistory from './Pages/AllAgencyHistory';
import OnlyAdmins from './Pages/AllAdmins';
import DailyBonusPage from './Pages/DailyBonus';
import RocketPage from './Pages/Rocket';


import Login from './Pages/Login';

import ProtectedRoute from './components/ProtectedRoute';

import './App.css';
import Profile from "./Pages/Profile";

function App() {

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);


  return (

    <Routes>

      {/* LOGIN ROUTE */}
      <Route path="/login" element={<Login />} />


      {/* PROTECTED ROUTES */}
      <Route path="/*" element={

        <ProtectedRoute>

          <div className="app-wrapper">

            <Navbar
              onHamburgerClick={() =>
                setIsMobileOpen(!isMobileOpen)
              }
            />

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

                    <Route path="/profile" element={<Profile />} />
                    
                    <Route path="/market-coins" element={<MarketCoins />} />

                    <Route path="/users/all" element={<AllUsers />} />

                    <Route path="/users/blocked" element={<BlockedUsers />} />

                    {/* <Route path="/managers/all" element={<AllManagers />} /> */}

                    <Route path="/manager/create" element={<MakeManager />} />

                    <Route path="/manager/all" element={<AllManagers />} />

                    <Route path="/reseller/create" element={<MakeReseller />} />

                    <Route path="/reseller/all" element={<AllResellers />} />

                    <Route path="/app-admin/create" element={<AppadminPage />} />

                    <Route path="/host/earnings" element={<AllEarnings />} />

                    <Route path="/host/history" element={<AllAgencyHistory />} /> 

                    <Route path="/app-admin/list" element={<OnlyAdmins />} />  

                    <Route path="/app-admin/daily-bonus" element={<DailyBonusPage />} />  

                    <Route path="/rocket-gift" element={<RocketPage />} />

                  </Routes>

                </div>

              </main>

            </div>

          </div>

        </ProtectedRoute>

      } />

    </Routes>

  );

}

export default App;