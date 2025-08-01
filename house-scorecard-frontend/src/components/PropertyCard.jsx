// src/components/PropertyCard.jsx
import React from 'react';
import { StatusBadge, StatusSelector } from './PropertyStatus';
import { useProperties } from '../contexts/PropertyContext';
import { PROPERTY_STATUSES } from '../constants/propertyStatus';
import './PropertyCard.css'; // Make sure CSS is imported

function PropertyCard({ property, showStatusSelector = false }) {
  const { updatePropertyStatus } = useProperties();
  
  // Guard clause: Render nothing or an error state if property data is missing
  if (!property) {
    // You could return null or a placeholder/error card
    return <div className="property-card error">Error: Property data unavailable.</div>;
  }

  // Handle status change
  const handleStatusChange = (newStatus) => {
    updatePropertyStatus(property.id, newStatus);
  };

  // --- Helper function to format price ---
  const formatPrice = (price) => {
    if (price == null || isNaN(Number(price))) return 'N/A';
    try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(Number(price));
    } catch (error) {
        console.error("Error formatting price in card:", error, price);
        return 'Error';
    }
  };

  // --- Helper function for score badge CSS class ---
  const getScoreClass = (score) => {
    if (score === null || score === undefined) return 'score-unknown';
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low'; // Includes 0 score
  };

  // --- Determine Status Text/Icon based on score ---
  // Provides a quick visual indicator related to score (e.g., issues if score is 0)
  let statusText = 'OK';
  let statusClass = 'met'; // CSS class suffix: must-haves-met
  let statusIcon = 'fa-check-circle'; // Font Awesome icon class

  if (property.score === 0) {
    statusText = 'Check Issues';
    statusClass = 'not-met'; // must-haves-not-met
    statusIcon = 'fa-exclamation-triangle';
  } else if (property.score === null || property.score === undefined) {
    statusText = 'Not Rated';
    statusClass = 'unknown'; // must-haves-unknown
    statusIcon = 'fa-question-circle';
  }
  // Note: A score > 0 doesn't guarantee *all* must-haves were met if logic changes,
  // but it's a reasonable indicator for the card summary.

  // --- Get the first image URL for the thumbnail ---
  // Check if imageUrls array exists and is not empty
  const thumbnailUrl = (property.imageUrls && property.imageUrls.length > 0)
    ? property.imageUrls[0] // Use the first URL in the array
    : null; // Use null if the array is empty or doesn't exist

  return (
    // The clickable wrapper div should be handled in the parent component (e.g., Dashboard.jsx)
    <div className="property-card">

      {/* Image Thumbnail Area */}
      <div className="property-image-placeholder">
        {thumbnailUrl ? (
          // Display the image if a URL exists
          <img
            src={thumbnailUrl}
            alt={`Thumbnail of ${property.address}`}
            loading="lazy" // Lazy load images for performance
            onError={(e) => { e.target.style.display = 'none'; /* Hide broken image */ }} // Basic error handling
          />
        ) : (
          // Display a placeholder icon if no image URL is available
          <i className="fas fa-home default-icon"></i>
        )}
      </div>

      {/* Property content wrapper for mobile/desktop layout */}
      <div className="property-content">
        {/* Property Information Section */}
        <div className="property-info">
          <h2>{property.address || 'Address Unavailable'}</h2>
          {property.listingUrl && (
            <p className="listing-url">
              <a href={property.listingUrl} target="_blank" rel="noopener noreferrer">
                View Listing
              </a>
            </p>
          )}
          <p className="price">{formatPrice(property.price)}</p>
          {/* Basic Stats (Beds, Baths, SqFt) */}
          <div className="stats">
            {/* Conditionally render each stat only if value exists */}
            {property.beds != null && <span><i className="fas fa-bed"></i> {property.beds} Beds</span>}
            {property.baths != null && <span><i className="fas fa-bath"></i> {property.baths} Baths</span>}
            {property.sqft != null && <span><i className="fas fa-ruler-combined"></i> {property.sqft} sqft</span>}
            {/* Show message if no stats available? Optional */}
            {property.beds == null && property.baths == null && property.sqft == null && <span><i>No size details</i></span>}
          </div>
        </div>

        {/* Score and Status Area */}
        <div className="score-area">
          {/* Score Badge */}
          <div className={`score-circle ${getScoreClass(property.score)}`}>
             {/* Display score or placeholder '--' */}
             {property.score ?? '--'}
          </div>
          {/* Status Indicator */}
          <p className={`must-haves-status must-haves-${statusClass}`}>
            <i className={`fas ${statusIcon}`}></i>
             {statusText}
          </p>
        </div>
        
        {/* Property Status - moved inside content for better desktop layout */}
        <div className="property-status-area">
          {showStatusSelector ? (
            <StatusSelector
              currentStatus={property.status}
              onStatusChange={handleStatusChange}
              size="small"
              showCurrentBadge={false}
            />
          ) : (
            <StatusBadge
              status={property.status}
              size="small"
            />
          )}
        </div>
      </div>

    </div> // End property-card
  );
}

export default PropertyCard;