// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const { isAuthenticated, logout } = useAuth();

  const navLinkStyle = ({ isActive }) => {
    return isActive ? 'active' : '';
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={handleNavClick}>
          <h2>House Scorecard</h2>
        </NavLink>
        <button className="sidebar-close-btn mobile-only" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {isAuthenticated && (
            <>
              <li><NavLink to="/properties" className={navLinkStyle} onClick={handleNavClick}><i className="fas fa-list-ul"></i> Properties</NavLink></li>
              <li><NavLink to="/compare" className={navLinkStyle} onClick={handleNavClick}><i className="fas fa-balance-scale"></i> Compare</NavLink></li>
              <li><NavLink to="/criteria" className={navLinkStyle} onClick={handleNavClick}><i className="fas fa-tasks"></i> My Criteria</NavLink></li>
              <li><NavLink to="/map" className={navLinkStyle} onClick={handleNavClick}><i className="fas fa-map-marker-alt"></i> Map</NavLink></li>
            </>
          )}
        </ul>
      </nav>
      <div className="sidebar-footer">
        {isAuthenticated ? (
          <>
            <NavLink to="/settings" className={navLinkStyle} onClick={handleNavClick}><i className="fas fa-cog"></i> Settings</NavLink>
            <button onClick={handleLogout} className="sidebar-logout-button">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </>
        ) : (
          <NavLink to="/login" className={navLinkStyle} onClick={handleNavClick}><i className="fas fa-sign-in-alt"></i> Login</NavLink>
        )}
      </div>
    </div>
  );
}

export default Sidebar;