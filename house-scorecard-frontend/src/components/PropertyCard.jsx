import React, { memo } from 'react';
import { StatusBadge, StatusSelector } from './PropertyStatus';
import { useProperties } from '../contexts/PropertyContext';
import { PROPERTY_STATUSES } from '../constants/propertyStatus';
import './PropertyCard.css';

const PropertyCard = memo(({ property, showStatusSelector = false }) => {
  const { updatePropertyStatus } = useProperties();

  if (!property) {
    return <div className="property-card error">Error: Property data unavailable.</div>;
  }

  const handleStatusChange = (newStatus) => {
    updatePropertyStatus(property.id, newStatus);
  };

  const formatPrice = (price) => {
    if (price == null || isNaN(Number(price))) return 'N/A';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
      }).format(Number(price));
    } catch (error) {
      return 'Error';
    }
  };

  const getScoreClass = (score) => {
    if (score === null || score === undefined) return 'score-unknown';
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  };

  let statusText = 'OK';
  let statusClass = 'met';
  let statusIcon = 'fa-check-circle';

  if (property.score === 0) {
    statusText = 'Check Issues';
    statusClass = 'not-met';
    statusIcon = 'fa-exclamation-triangle';
  } else if (property.score === null || property.score === undefined) {
    statusText = 'Not Rated';
    statusClass = 'unknown';
    statusIcon = 'fa-question-circle';
  }

  const thumbnailUrl = (property.imageUrls && property.imageUrls.length > 0)
    ? property.imageUrls[0]
    : null;

  return (
    <div className="property-card" data-testid="property-card">
      <div className="property-image-placeholder">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Thumbnail of ${property.address}`}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
            data-testid="property-image"
          />
        ) : (
          <i className="fas fa-home default-icon" data-testid="property-placeholder-icon"></i>
        )}
      </div>
      <div className="property-content">
        <div className="property-info">
          <h2 data-testid="property-address">{property.address || 'Address Unavailable'}</h2>
          {property.listingUrl && (
            <p className="listing-url">
              <a href={property.listingUrl} target="_blank" rel="noopener noreferrer" data-testid="listing-url-link">
                View Listing
              </a>
            </p>
          )}
          <p className="price" data-testid="property-price">{formatPrice(property.price)}</p>
          <div className="stats">
            {property.beds != null && <span data-testid="property-beds"><i className="fas fa-bed"></i> {property.beds} Beds</span>}
            {property.baths != null && <span data-testid="property-baths"><i className="fas fa-bath"></i> {property.baths} Baths</span>}
            {property.sqft != null && <span data-testid="property-sqft"><i className="fas fa-ruler-combined"></i> {property.sqft} sqft</span>}
            {property.beds == null && property.baths == null && property.sqft == null && <span data-testid="no-size-details"><i>No size details</i></span>}
          </div>
        </div>
        <div className="score-area">
          <div className={`score-circle ${getScoreClass(property.score)}`} data-testid="property-score">
             {property.score ?? '--'}
          </div>
          <p className={`must-haves-status must-haves-${statusClass}`} data-testid="property-status-text">
            <i className={`fas ${statusIcon}`}></i>
             {statusText}
          </p>
        </div>
        <div className="property-status-area">
          {showStatusSelector ? (
            <StatusSelector
              currentStatus={property.status}
              onStatusChange={handleStatusChange}
              size="small"
              showCurrentBadge={false}
              data-testid="status-selector"
            />
          ) : (
            <StatusBadge
              status={property.status}
              size="small"
              data-testid="status-badge"
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default PropertyCard;