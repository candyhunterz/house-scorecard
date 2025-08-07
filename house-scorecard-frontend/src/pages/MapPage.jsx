// src/pages/MapPage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useProperties } from '../contexts/PropertyContext';
import { useToast } from '../contexts/ToastContext';
import L from 'leaflet'; // Import Leaflet library itself for custom icons or bounds calculation
import './MapPage.css'; // Create this CSS file next

// Fix for default marker icon issue with bundlers like Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
// --- End Icon Fix ---


// Component to automatically adjust map bounds to fit markers
function FitBounds({ properties }) {
  const map = useMap();

  useMemo(() => { // Use useMemo to calculate bounds only when properties change
    const validProperties = properties.filter(p => p.latitude != null && p.longitude != null);

    if (validProperties.length > 0) {
      const bounds = L.latLngBounds(
        validProperties.map(p => [p.latitude, p.longitude])
      );
      if (bounds.isValid()) {
         console.log("Fitting map bounds:", bounds);
         map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding
      } else {
          console.log("Calculated bounds are invalid.");
          // Fallback to a default view if bounds are invalid (e.g., single point)
          map.setView([validProperties[0].latitude, validProperties[0].longitude], 13);
      }

    } else {
      // Default view if no valid properties
      console.log("No valid properties with coordinates, setting default view.");
      map.setView([40.7128, -74.0060], 5); // Default to NYC area, zoom level 5
    }
  }, [properties, map]); // Dependencies

  return null; // This component doesn't render anything itself
}


function MapPage() {
  const { properties, geocodeProperties } = useProperties();
  const { showInfo, showSuccess } = useToast();
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filter properties that have valid coordinates
  const propertiesWithCoords = useMemo(() =>
    properties.filter(p => p.latitude != null && p.longitude != null),
    [properties]
  );

  // Count properties without coordinates
  const propertiesWithoutCoords = useMemo(() =>
    properties.filter(p => !p.latitude || !p.longitude),
    [properties]
  );

  const defaultPosition = [43.6532, -79.3832]; // Default center (Toronto, Canada)

  const handleGeocodeProperties = async () => {
    if (propertiesWithoutCoords.length === 0) {
      showInfo('All properties already have map coordinates!');
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeProperties();
      if (result.geocoded_count > 0) {
        showSuccess(`🗺️ Successfully added ${result.geocoded_count} properties to the map!`);
      } else {
        showInfo('No additional properties could be geocoded.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      showError('Failed to add properties to map. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="map-page-container">
      <h1>Property Map View</h1>
      
      {/* Map Stats and Controls */}
      <div className="map-controls">
        <div className="map-stats">
          <span className="stat">
            📍 {propertiesWithCoords.length} properties on map
          </span>
          {propertiesWithoutCoords.length > 0 && (
            <span className="stat warning">
              📍 {propertiesWithoutCoords.length} properties missing coordinates
            </span>
          )}
        </div>
        
        {propertiesWithoutCoords.length > 0 && (
          <button 
            onClick={handleGeocodeProperties} 
            disabled={isGeocoding}
            className="btn btn-primary geocode-btn"
          >
            {isGeocoding ? '🌐 Adding to map...' : `🗺️ Add ${propertiesWithoutCoords.length} properties to map`}
          </button>
        )}
      </div>

      {/* Properties without coordinates list */}
      {propertiesWithoutCoords.length > 0 && !isGeocoding && (
        <div className="missing-coords-info">
          <h3>Properties not on map:</h3>
          <ul>
            {propertiesWithoutCoords.slice(0, 5).map(prop => (
              <li key={prop.id}>{prop.address}</li>
            ))}
            {propertiesWithoutCoords.length > 5 && (
              <li>... and {propertiesWithoutCoords.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* MapContainer sets up the Leaflet map */}
      <MapContainer center={defaultPosition} zoom={5} className="map-view">
        {/* TileLayer provides the base map visuals (OpenStreetMap) */}
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map over properties with coordinates and add a Marker for each */}
        {propertiesWithCoords.map(prop => (
          <Marker key={prop.id} position={[prop.latitude, prop.longitude]}>
            {/* Popup appears when the marker is clicked */}
            <Popup>
              <div className="property-popup">
                <strong>{prop.address}</strong><br />
                <div className="popup-details">
                  Price: {prop.price ? `$${prop.price.toLocaleString()}` : 'N/A'}<br />
                  Score: <span className={`score ${prop.score ? 'has-score' : ''}`}>{prop.score ?? '--'}</span><br />
                  {prop.beds && <span>🛏️ {prop.beds} beds </span>}
                  {prop.baths && <span>🛁 {prop.baths} baths </span>}
                  {prop.sqft && <span>📐 {prop.sqft} sqft</span>}
                </div>
                {/* Link to the detail page */}
                <div className="popup-actions">
                  <a href={`/properties/${prop.id}`} className="view-details-btn">View Details</a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Component to adjust map bounds */}
        <FitBounds properties={propertiesWithCoords} />

      </MapContainer>
    </div>
  );
}

export default MapPage;