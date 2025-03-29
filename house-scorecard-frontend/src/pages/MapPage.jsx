// src/pages/MapPage.jsx
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useProperties } from '../contexts/PropertyContext';
import L from 'leaflet'; // Import Leaflet library itself for custom icons or bounds calculation
import './MapPage.css'; // Create this CSS file next

// Optional: Fix for default marker icon issue with bundlers like Vite/Webpack
// import iconUrl from 'leaflet/dist/images/marker-icon.png';
// import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// const DefaultIcon = L.icon({
//     iconUrl,
//     iconRetinaUrl,
//     shadowUrl,
//     iconSize:    [25, 41],
//     iconAnchor:  [12, 41],
//     popupAnchor: [1, -34],
//     tooltipAnchor: [16, -28],
//     shadowSize:  [41, 41]
// });
// L.Marker.prototype.options.icon = DefaultIcon;
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
  const { properties } = useProperties();

  // Filter properties that have valid coordinates
  const propertiesWithCoords = useMemo(() =>
    properties.filter(p => p.latitude != null && p.longitude != null),
    [properties]
  );

  const defaultPosition = [40.7128, -74.0060]; // Default center (e.g., NYC) if no properties

  return (
    <div className="map-page-container">
      <h1>Property Map View</h1>
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
              <strong>{prop.address}</strong><br />
              Price: {prop.price ? `$${prop.price.toLocaleString()}` : 'N/A'}<br />
              Score: {prop.score ?? '--'}
              {/* Optional: Add a link to the detail page */}
              <br/><a href={`/properties/${prop.id}`}>View Details</a>
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