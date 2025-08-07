// src/pages/Compare.jsx
import React, { useState } from 'react';
import { useProperties } from '../contexts/PropertyContext';
import { useCriteria } from '../contexts/CriteriaContext';
import './Compare.css';
import { Link } from 'react-router-dom';

// Helper function for formatting price
const formatPrice = (price) => {
    if (price == null || isNaN(price)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
};

// Helper to display rating values consistently
const displayRating = (property, criterion, isMobile = false) => {
    const rating = property.ratings?.[criterion.id];

    if (rating === undefined || rating === null) {
        return <span className="criteria-rating not-rated">--</span>;
    }

    switch (criterion.type) {
        case 'mustHave':
            return rating ?
                <span className="criteria-rating met"><i className="fas fa-check-circle"></i> {isMobile ? 'Yes' : 'Yes'}</span> :
                <span className="criteria-rating not-met"><i className="fas fa-times-circle"></i> {isMobile ? 'No' : 'No'}</span>;
        case 'dealBreaker':
            return rating ?
                <span className="criteria-rating not-met"><i className="fas fa-ban"></i> {isMobile ? 'Yes' : 'Yes'}</span> :
                <span className="criteria-rating met"><i className="fas fa-check-circle"></i> {isMobile ? 'No' : 'No'}</span>;
        case 'niceToHave':
            if (rating === 0) return <span className="criteria-rating not-rated">0/5</span>;
            return <span className="criteria-rating rated">{rating}/5</span>;
        default:
            return <span className="criteria-rating not-rated">--</span>;
    }
};

// Helper to get score class
const getScoreClass = (score) => {
    if (score === null || score === undefined) return 'zero';
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    if (score === 0) return 'zero';
    return 'low';
};

// Mobile Property Card Component
const MobilePropertyCard = ({ property, mustHaves, niceToHaves, dealBreakers }) => {
    return (
        <div className="mobile-property-card">
            <div className="property-header">
                <h2 className="property-title">
                    <Link to={`/properties/${property.id}`}>
                        {property.address}
                    </Link>
                </h2>
                <div className={`property-score ${getScoreClass(property.score)}`}>
                    {property.score ?? '--'}
                </div>
            </div>

            <div className="property-basic-info">
                <div className="basic-info-grid">
                    <div className="info-item">
                        <div className="info-label">Price</div>
                        <div className="info-value">{formatPrice(property.price)}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Bedrooms</div>
                        <div className="info-value">{property.beds ?? 'N/A'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Bathrooms</div>
                        <div className="info-value">{property.baths ?? 'N/A'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Sq. Footage</div>
                        <div className="info-value">{property.sqft ? `${property.sqft} sqft` : 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div className="criteria-section">
                {mustHaves.length > 0 && (
                    <div className="criteria-group">
                        <h3>Must Haves</h3>
                        {mustHaves.map(criterion => (
                            <div key={criterion.id} className="criteria-item">
                                <div className="criteria-text">{criterion.text}</div>
                                {displayRating(property, criterion, true)}
                            </div>
                        ))}
                    </div>
                )}

                {dealBreakers.length > 0 && (
                    <div className="criteria-group">
                        <h3>Deal Breakers</h3>
                        {dealBreakers.map(criterion => (
                            <div key={criterion.id} className="criteria-item">
                                <div className="criteria-text">{criterion.text}</div>
                                {displayRating(property, criterion, true)}
                            </div>
                        ))}
                    </div>
                )}

                {niceToHaves.length > 0 && (
                    <div className="criteria-group">
                        <h3>Nice to Haves</h3>
                        {niceToHaves.map(criterion => (
                            <div key={criterion.id} className="criteria-item">
                                <div className="criteria-text">
                                    {criterion.text}
                                    <span className="criteria-weight">(Weight: {criterion.weight})</span>
                                </div>
                                {displayRating(property, criterion, true)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

function Compare() {
  // Get data from contexts
  const { properties } = useProperties();
  const { mustHaves, niceToHaves, dealBreakers } = useCriteria();
  
  // State for mobile navigation
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);

  // Combine all criteria for row headers
  const allCriteria = [...mustHaves, ...niceToHaves, ...dealBreakers];

  // Sort properties by score (highest first) or leave as is
  const sortedProperties = [...properties].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  if (sortedProperties.length === 0) {
      return (
          <div className="compare-container empty">
              <h1>Compare Properties</h1>
              <p>You haven't added any properties yet. Add some properties from the Dashboard to compare them here.</p>
               <Link to="/properties" className="btn btn-primary">Go to Dashboard</Link>
          </div>
      );
  }

  const handlePrevious = () => {
    setCurrentPropertyIndex(prev => 
      prev > 0 ? prev - 1 : sortedProperties.length - 1
    );
  };

  const handleNext = () => {
    setCurrentPropertyIndex(prev => 
      prev < sortedProperties.length - 1 ? prev + 1 : 0
    );
  };

  const currentProperty = sortedProperties[currentPropertyIndex];

  return (
    <div className="compare-container">
      <h1>Compare Properties</h1>

      {/* Mobile Layout */}
      <div className="mobile-compare-wrapper">
        {sortedProperties.length > 1 && (
          <div className="mobile-property-nav">
            <button 
              className="nav-button" 
              onClick={handlePrevious}
              disabled={sortedProperties.length <= 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <span className="property-counter">
              {currentPropertyIndex + 1} of {sortedProperties.length}
            </span>
            
            <button 
              className="nav-button" 
              onClick={handleNext}
              disabled={sortedProperties.length <= 1}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}

        <MobilePropertyCard 
          property={currentProperty}
          mustHaves={mustHaves}
          niceToHaves={niceToHaves}
          dealBreakers={dealBreakers}
        />
      </div>

      {/* Desktop/Tablet Table Layout */}
      <div className="compare-table-wrapper">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="sticky-col header-cell criteria-col">Feature</th>{/* Criteria Column Header */}{/* Property Column Headers */}{sortedProperties.map(prop => (
                <th key={prop.id} className="header-cell property-col">
                  <Link to={`/properties/${prop.id}`} title="View Details">
                    {prop.address}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* --- Basic Info Rows --- */}
            <tr className="highlight-row">
              <td className="sticky-col criteria-col"><strong>Score</strong></td>{sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell score-cell">
                    <span className={`score-badge-table ${prop.score >= 75 ? 'high' : prop.score >= 50 ? 'medium' : prop.score === 0 ? 'zero' : 'low'}`}>
                         {prop.score ?? '--'}
                    </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Price</td>{sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{formatPrice(prop.price)}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Bedrooms</td>{sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{prop.beds ?? 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Bathrooms</td>{sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{prop.baths ?? 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Sq. Footage</td>{sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{prop.sqft ? `${prop.sqft} sqft` : 'N/A'}</td>
              ))}
            </tr>

             {/* --- Divider --- */}
             <tr className="divider-row"><td colSpan={sortedProperties.length + 1}></td></tr>

            {/* --- Criteria Rows --- */}
            {allCriteria.map(criterion => (
              <tr key={criterion.id}>
                <td className="sticky-col criteria-col">
                    {criterion.text}
                    {criterion.type === 'niceToHave' && <span className="weight-label-table"> (W: {criterion.weight})</span>}
                </td>{sortedProperties.map(prop => (
                  <td key={prop.id} className="data-cell rating-cell">
                    <span className="rating-display">
                      {displayRating(prop, criterion, false)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Compare;