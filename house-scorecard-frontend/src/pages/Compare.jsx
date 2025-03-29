// src/pages/Compare.jsx
import React from 'react';
import { useProperties } from '../contexts/PropertyContext';
import { useCriteria } from '../contexts/CriteriaContext';
import './Compare.css'; // Create this CSS file next
import { Link } from 'react-router-dom'; // To link back to property details

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
const displayRating = (property, criterion) => {
    const rating = property.ratings?.[criterion.id]; // Use optional chaining

    if (rating === undefined || rating === null) {
        return <span className="rating-display not-rated">--</span>;
    }

    switch (criterion.type) {
        case 'mustHave':
            return rating ?
                <span className="rating-display met"><i className="fas fa-check-circle"></i> Yes</span> :
                <span className="rating-display not-met"><i className="fas fa-times-circle"></i> No</span>;
        case 'dealBreaker':
            // Checked (true) means the negative condition IS present
            return rating ?
                <span className="rating-display not-met"><i className="fas fa-ban"></i> Yes</span> :
                <span className="rating-display met"><i className="fas fa-check-circle"></i> No</span>;
        case 'niceToHave':
            // Display stars or number (0-5)
            if (rating === 0) return <span className="rating-display not-rated">0/5</span>;
            // Simple text display for table
            return <span className="rating-display rated">{rating}/5</span>;
            // Or render stars (might make table wide)
            // return <span className="rating-display rated">{Array(rating).fill(null).map((_, i) => <i key={i} className="fas fa-star"></i>)}</span>
        default:
            return <span className="rating-display not-rated">--</span>;
    }
};

function Compare() {
  // Get data from contexts
  const { properties } = useProperties();
  const { mustHaves, niceToHaves, dealBreakers } = useCriteria();

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

  return (
    <div className="compare-container">
      <h1>Compare Properties</h1>

      <div className="compare-table-wrapper"> {/* Wrapper for horizontal scrolling */}
        <table className="compare-table">
          <thead>
            <tr>
              <th className="sticky-col header-cell criteria-col">Feature</th> {/* Criteria Column Header */}
              {/* Property Column Headers */}
              {sortedProperties.map(prop => (
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
              <td className="sticky-col criteria-col"><strong>Score</strong></td>
              {sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell score-cell">
                    <span className={`score-badge-table ${prop.score >= 75 ? 'high' : prop.score >= 50 ? 'medium' : prop.score === 0 ? 'zero' : 'low'}`}>
                         {prop.score ?? '--'}
                    </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Price</td>
              {sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{formatPrice(prop.price)}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Bedrooms</td>
              {sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{prop.beds ?? 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Bathrooms</td>
              {sortedProperties.map(prop => (
                <td key={prop.id} className="data-cell">{prop.baths ?? 'N/A'}</td>
              ))}
            </tr>
            <tr>
              <td className="sticky-col criteria-col">Sq. Footage</td>
              {sortedProperties.map(prop => (
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
                </td>
                {sortedProperties.map(prop => (
                  <td key={prop.id} className="data-cell rating-cell">
                    {displayRating(prop, criterion)}
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