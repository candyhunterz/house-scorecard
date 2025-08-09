// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
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
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Mobile close button */}
      <button className="mobile-close-btn" onClick={onClose}>
        <i className="fas fa-times"></i>
      </button>

      <div className="sidebar-content">
        <ul className="nav-list">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              data-testid="nav-dashboard"
            >
              <i className="fas fa-chart-line"></i>
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/properties"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              data-testid="nav-properties"
            >
              <i className="fas fa-list"></i>
              <span>Properties</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/compare"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              data-testid="nav-comparison"
            >
              <i className="fas fa-balance-scale"></i>
              <span>Compare</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/criteria"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              data-testid="nav-criteria"
            >
              <i className="fas fa-list-check"></i>
              <span>My Criteria</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/map"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <i className="fas fa-map-marker-alt"></i>
              <span>Map</span>
            </NavLink>
          </li>
        </ul>

        {/* Settings and Logout buttons */}
        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </NavLink>
          
          <button className="logout-btn" onClick={handleLogout} data-testid="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;