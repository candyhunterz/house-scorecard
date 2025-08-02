// src/pages/Dashboard.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';
import { useCriteria } from '../contexts/CriteriaContext';
import { PROPERTY_STATUSES } from '../constants/propertyStatus';
import './Dashboard.css';

function Dashboard() {
  const { properties } = useProperties();
  const { mustHaves, niceToHaves, dealBreakers } = useCriteria();
  const navigate = useNavigate();

  // Calculate stats
  const stats = useMemo(() => {
    const total = properties.length;
    const statusCounts = Object.values(PROPERTY_STATUSES).reduce((acc, status) => {
      acc[status] = properties.filter(p => p.status === status).length;
      return acc;
    }, {});

    const ratedProperties = properties.filter(p => 
      Object.keys(p.ratings || {}).length > 0
    );

    const averageScore = ratedProperties.length > 0 
      ? Math.round(ratedProperties.reduce((sum, p) => sum + (p.score || 0), 0) / ratedProperties.length)
      : 0;

    const topProperties = [...properties]
      .filter(p => p.score !== null && p.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);

    const criteriaSetup = mustHaves.length + niceToHaves.length + dealBreakers.length > 0;
    const needsRating = properties.filter(p => Object.keys(p.ratings || {}).length === 0).length;

    return {
      total,
      statusCounts,
      averageScore,
      topProperties,
      ratedProperties: ratedProperties.length,
      criteriaSetup,
      needsRating
    };
  }, [properties, mustHaves, niceToHaves, dealBreakers]);

  const getProgressStep = () => {
    if (!stats.criteriaSetup) return 1;
    if (stats.total === 0) return 2;
    if (stats.needsRating > 0) return 3;
    return 4;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case PROPERTY_STATUSES.INTERESTED:
        return { label: 'Interested', icon: 'fas fa-heart', color: '#10b981' };
      case PROPERTY_STATUSES.VIEWING_SCHEDULED:
        return { label: 'Viewing Scheduled', icon: 'fas fa-calendar-check', color: '#3b82f6' };
      case PROPERTY_STATUSES.OFFER_MADE:
        return { label: 'Offer Made', icon: 'fas fa-handshake', color: '#f59e0b' };
      case PROPERTY_STATUSES.PASSED:
        return { label: 'Passed', icon: 'fas fa-times-circle', color: '#ef4444' };
      default:
        return { label: 'Unset', icon: 'fas fa-circle', color: '#6b7280' };
    }
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-page-header">
        <h1>Dashboard</h1>
        <p>Welcome to your House Scorecard dashboard</p>
      </header>

      {/* Quick Stats */}
      <section className="stats-section">
        <h2>Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-home"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Total Properties</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-star"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.averageScore || '--'}</h3>
              <p>Average Score</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.ratedProperties}</h3>
              <p>Rated Properties</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-heart"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.statusCounts[PROPERTY_STATUSES.INTERESTED] || 0}</h3>
              <p>Interested</p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Guide */}
      <section className="getting-started-section">
        <h2>Getting Started</h2>
        <div className="progress-steps">
          <div className={`step ${getProgressStep() >= 1 ? 'active' : ''} ${stats.criteriaSetup ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Set up your criteria</h3>
              <p>Define what matters most in your property search</p>
              {!stats.criteriaSetup && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/criteria')}
                >
                  Set up criteria
                </button>
              )}
              {stats.criteriaSetup && (
                <div className="step-completed">
                  <i className="fas fa-check"></i>
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>

          <div className={`step ${getProgressStep() >= 2 ? 'active' : ''} ${stats.total > 0 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Add properties</h3>
              <p>Start building your property list</p>
              {stats.total === 0 && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/add-property')}
                >
                  Add first property
                </button>
              )}
              {stats.total > 0 && (
                <div className="step-completed">
                  <i className="fas fa-check"></i>
                  <span>{stats.total} properties added</span>
                </div>
              )}
            </div>
          </div>

          <div className={`step ${getProgressStep() >= 3 ? 'active' : ''} ${stats.needsRating === 0 && stats.total > 0 ? 'completed' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Rate your properties</h3>
              <p>Score properties against your criteria</p>
              {stats.needsRating > 0 && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/properties')}
                >
                  Rate {stats.needsRating} properties
                </button>
              )}
              {stats.needsRating === 0 && stats.total > 0 && (
                <div className="step-completed">
                  <i className="fas fa-check"></i>
                  <span>All properties rated</span>
                </div>
              )}
            </div>
          </div>

          <div className={`step ${getProgressStep() >= 4 ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Compare and decide</h3>
              <p>Compare your top properties and make your choice</p>
              {stats.ratedProperties >= 2 && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/compare')}
                >
                  Compare properties
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="action-cards">
          <button 
            className="action-card"
            onClick={() => navigate('/add-property')}
          >
            <i className="fas fa-plus"></i>
            <span>Add Property</span>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/properties')}
          >
            <i className="fas fa-list"></i>
            <span>View All Properties</span>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/compare')}
          >
            <i className="fas fa-balance-scale"></i>
            <span>Compare Properties</span>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/criteria')}
          >
            <i className="fas fa-cog"></i>
            <span>Manage Criteria</span>
          </button>
        </div>
      </section>

      {/* Top Properties */}
      {stats.topProperties.length > 0 && (
        <section className="top-properties-section">
          <h2>Top Scoring Properties</h2>
          <div className="top-properties-list">
            {stats.topProperties.map(property => (
              <div 
                key={property.id} 
                className="top-property-item"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <div className="property-info">
                  <h4>{property.address}</h4>
                  <p>
                    {property.beds} beds • {property.baths} baths
                    {property.price && ` • $${property.price.toLocaleString()}`}
                  </p>
                </div>
                <div className="property-score">
                  <span className="score-badge">{property.score}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status Breakdown */}
      {stats.total > 0 && (
        <section className="status-breakdown-section">
          <h2>Properties by Status</h2>
          <div className="status-breakdown">
            {Object.entries(stats.statusCounts).map(([status, count]) => {
              if (count === 0) return null;
              const config = getStatusConfig(status);
              return (
                <div key={status} className="status-item">
                  <div className="status-info">
                    <i className={config.icon} style={{ color: config.color }}></i>
                    <span>{config.label}</span>
                  </div>
                  <span className="status-count">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights */}
      {stats.total > 0 && (
        <section className="insights-section">
          <h2>Insights & Recommendations</h2>
          <div className="insights-list">
            {stats.needsRating > 0 && (
              <div className="insight-item">
                <i className="fas fa-star text-warning"></i>
                <span>
                  {stats.needsRating} {stats.needsRating === 1 ? 'property needs' : 'properties need'} rating
                </span>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate('/properties')}
                >
                  Rate now
                </button>
              </div>
            )}
            
            {!stats.criteriaSetup && (
              <div className="insight-item">
                <i className="fas fa-list-check text-info"></i>
                <span>Set up your criteria to start rating properties effectively</span>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate('/criteria')}
                >
                  Set up
                </button>
              </div>
            )}

            {stats.ratedProperties >= 2 && (
              <div className="insight-item">
                <i className="fas fa-balance-scale text-success"></i>
                <span>You have {stats.ratedProperties} rated properties ready to compare</span>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate('/compare')}
                >
                  Compare
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;