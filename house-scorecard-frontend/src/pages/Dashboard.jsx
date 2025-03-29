// src/pages/Dashboard.jsx
import React, { useState, useMemo } from 'react'; // Added useMemo
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { useProperties } from '../contexts/PropertyContext';
import './Dashboard.css'; // Ensure styles are imported

function Dashboard() {
  // Get properties from context
  const { properties } = useProperties();
  const navigate = useNavigate();

  // --- State for Sorting and Filtering ---
  const [sortBy, setSortBy] = useState('score_desc'); // Initial sort: Score Descending
  const [filterText, setFilterText] = useState('');   // Initial filter: Empty

  // --- Event Handlers ---
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };

  const handleAddPropertyClick = () => { navigate('/add-property'); };
  const handleCardClick = (propertyId) => { navigate(`/properties/${propertyId}`); };
  const handleSettingsClick = () => { navigate('/settings'); }; // Or open modal

  // --- Filtering and Sorting Logic ---
  // Use useMemo to avoid recalculating on every render unless properties, filter, or sort changes
  const filteredAndSortedProperties = useMemo(() => {
    console.log("Filtering/Sorting Properties...");

    // 1. Filter
    const lowerCaseFilter = filterText.toLowerCase();
    const filtered = properties.filter(prop => {
      // Simple filter: checks address and notes (case-insensitive)
      return (
        prop.address?.toLowerCase().includes(lowerCaseFilter) ||
        prop.notes?.toLowerCase().includes(lowerCaseFilter)
        // Add more fields to filter later (e.g., price range, beds)
      );
    });

    // 2. Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'score_desc':
          // Handle null scores (treat null as lowest)
          return (b.score ?? -1) - (a.score ?? -1);
        case 'score_asc':
          return (a.score ?? -1) - (b.score ?? -1);
        case 'price_desc':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'price_asc':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'address_asc':
          return (a.address || '').localeCompare(b.address || '');
        case 'address_desc':
            return (b.address || '').localeCompare(a.address || '');
        // Add date added sort later if timestamp exists
        default:
          return 0; // No sorting or default
      }
    });

    return sorted;

  }, [properties, filterText, sortBy]); // Dependencies for recalculation


  return (
    <div className="dashboard-container">
      {/* --- Updated Header with Controls --- */}
      <header className="dashboard-header">
        <h1>My Properties ({filteredAndSortedProperties.length})</h1>
        <div className="dashboard-controls">
           {/* Filter Input */}
           <input
              type="text"
              placeholder="Filter by address/notes..."
              value={filterText}
              onChange={handleFilterChange}
              className="filter-input"
           />
           {/* Sort Dropdown */}
           <select value={sortBy} onChange={handleSortChange} className="sort-select">
             <option value="score_desc">Sort: Score (High-Low)</option>
             <option value="score_asc">Sort: Score (Low-High)</option>
             <option value="price_asc">Sort: Price (Low-High)</option>
             <option value="price_desc">Sort: Price (High-Low)</option>
             <option value="address_asc">Sort: Address (A-Z)</option>
             <option value="address_desc">Sort: Address (Z-A)</option>
             {/* Add Date Added later */}
           </select>
           {/* Settings Icon (Optional) */}
           <i className="fas fa-cog settings-icon" title="Settings" onClick={handleSettingsClick}></i>
        </div>
      </header>
      {/* --- End Updated Header --- */}


      {/* --- Property List --- */}
      <div className="property-list">
        {/* Render message or the filtered/sorted list */}
        {filteredAndSortedProperties.length === 0 ? (
          <p className="no-properties-message">
            {properties.length === 0 ? // Check if original list was empty
                "No properties added yet. Click the '+' button to add your first visited house!" :
                "No properties match your current filter." // Message when filtering yields no results
            }
          </p>
        ) : (
          // Map over the derived list
          filteredAndSortedProperties.map(property => (
            <div
              key={property.id}
              className="property-card-wrapper"
              onClick={() => handleCardClick(property.id)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleCardClick(property.id)}
            >
              <PropertyCard property={property} />
            </div>
          ))
        )}
      </div>
      {/* --- End Property List --- */}


      {/* Floating Action Button */}
      <button className="fab" title="Add New Property" onClick={handleAddPropertyClick}>+</button>

    </div> // End container
  );
}

export default Dashboard;