// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

function Sidebar() {
  const { isAuthenticated, logout } = useAuth();

  const navLinkStyle = ({ isActive }) => {
    return isActive ? 'active' : '';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2>House Scorecard</h2>
        </NavLink>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {isAuthenticated && (
            <>
              <li><NavLink to="/properties" className={navLinkStyle}><i className="fas fa-list-ul"></i> Properties</NavLink></li>
              <li><NavLink to="/compare" className={navLinkStyle}><i className="fas fa-balance-scale"></i> Compare</NavLink></li>
              <li><NavLink to="/criteria" className={navLinkStyle}><i className="fas fa-tasks"></i> My Criteria</NavLink></li>
              <li><NavLink to="/map" className={navLinkStyle}><i className="fas fa-map-marker-alt"></i> Map</NavLink></li>
            </>
          )}
        </ul>
      </nav>
      <div className="sidebar-footer">
        {isAuthenticated ? (
          <button onClick={logout} className="sidebar-logout-button">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        ) : (
          <NavLink to="/login" className={navLinkStyle}><i className="fas fa-sign-in-alt"></i> Login</NavLink>
        )}
        {/* Link settings to a future settings page if needed */}
        {isAuthenticated && <NavLink to="/settings" className={navLinkStyle}><i className="fas fa-cog"></i> Settings</NavLink>}
      </div>
    </div>
  );
}

export default Sidebar;