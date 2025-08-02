// src/pages/Properties.jsx
import React, { useState, useMemo, useEffect } from 'react'; // Added useMemo
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import SearchAndFilter from '../components/SearchAndFilter';
import { useProperties } from '../contexts/PropertyContext';
import { useCriteria } from '../contexts/CriteriaContext';
import './Properties.css'; // Ensure styles are imported

function Properties() {
  // Get properties from context
  const { properties } = useProperties();
  const { mustHaves, dealBreakers } = useCriteria();
  const navigate = useNavigate();

  // --- State for Sorting and Filtering ---
  const [sortBy, setSortBy] = useState('score_desc'); // Initial sort: Score Descending
  const [searchText, setSearchText] = useState('');   // Search text
  const [filters, setFilters] = useState({
    minPrice: null,
    maxPrice: null,
    minScore: null,
    maxScore: null,
    minBeds: null,
    maxBeds: null,
    minBaths: null,
    maxBaths: null,
    minSqft: null,
    maxSqft: null,
    mustHavesMet: null,
    dealBreakersPresent: null,
    statuses: []
  });
  const [showScroll, setShowScroll] = useState(false);

  // --- Scroll-to-top Logic ---
  const checkScrollTop = () => {
    // Show button when page is scrolled down
    if (!showScroll && window.pageYOffset > 300) {
      setShowScroll(true);
    } else if (showScroll && window.pageYOffset <= 300) {
      setShowScroll(false);
    }
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);
    return () => {
      window.removeEventListener('scroll', checkScrollTop);
    };
  }, [showScroll]);

  // --- Event Handlers ---
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  const handleSearchChange = (newSearchText) => {
    setSearchText(newSearchText);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setFilters({
      minPrice: null,
      maxPrice: null,
      minScore: null,
      maxScore: null,
      minBeds: null,
      maxBeds: null,
      minBaths: null,
      maxBaths: null,
      minSqft: null,
      maxSqft: null,
      mustHavesMet: null,
      dealBreakersPresent: null,
      statuses: []
    });
  };

  const handleAddPropertyClick = () => { navigate('/add-property'); };
  const handleBulkImportClick = () => { navigate('/bulk-import'); };
  const handleCardClick = (propertyId) => { navigate(`/properties/${propertyId}`); };

  // Helper function to check if property meets criteria requirements
  const checkCriteriaStatus = (property) => {
    const ratings = property.ratings || {};
    
    // Check must-haves
    const mustHavesMet = mustHaves.length === 0 || mustHaves.every(mh => ratings[mh.id] === true);
    
    // Check deal-breakers
    const hasDealBreakers = dealBreakers.some(db => ratings[db.id] === true);
    
    return { mustHavesMet, hasDealBreakers };
  };

  // --- Filtering and Sorting Logic ---
  // Use useMemo to avoid recalculating on every render unless properties, filter, or sort changes
  const filteredAndSortedProperties = useMemo(() => {
    console.log("Filtering/Sorting Properties...");

    // 1. Filter
    const lowerCaseSearch = searchText.toLowerCase();
    const filtered = properties.filter(prop => {
      // Text search: checks address and notes (case-insensitive)
      const matchesSearch = !searchText || (
        prop.address?.toLowerCase().includes(lowerCaseSearch) ||
        prop.notes?.toLowerCase().includes(lowerCaseSearch)
      );
      
      if (!matchesSearch) return false;
      
      // Price filters
      if (filters.minPrice && (prop.price === null || prop.price < filters.minPrice)) return false;
      if (filters.maxPrice && (prop.price === null || prop.price > filters.maxPrice)) return false;
      
      // Score filters
      if (filters.minScore && (prop.score === null || prop.score < filters.minScore)) return false;
      if (filters.maxScore && (prop.score === null || prop.score > filters.maxScore)) return false;
      
      // Bedroom filters
      if (filters.minBeds && (prop.beds === null || prop.beds < filters.minBeds)) return false;
      if (filters.maxBeds && (prop.beds === null || prop.beds > filters.maxBeds)) return false;
      
      // Bathroom filters
      if (filters.minBaths && (prop.baths === null || prop.baths < filters.minBaths)) return false;
      if (filters.maxBaths && (prop.baths === null || prop.baths > filters.maxBaths)) return false;
      
      // Square footage filters
      if (filters.minSqft && (prop.sqft === null || prop.sqft < filters.minSqft)) return false;
      if (filters.maxSqft && (prop.sqft === null || prop.sqft > filters.maxSqft)) return false;
      
      // Criteria-based filters
      const { mustHavesMet, hasDealBreakers } = checkCriteriaStatus(prop);
      
      if (filters.mustHavesMet && !mustHavesMet) return false;
      if (filters.dealBreakersPresent === false && hasDealBreakers) return false;
      
      // Status filters
      if (filters.statuses && filters.statuses.length > 0) {
        const propStatus = prop.status; // Keep as null if unset
        if (!filters.statuses.includes(propStatus)) return false;
      }
      
      return true;
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

  }, [properties, searchText, filters, sortBy, mustHaves, dealBreakers]); // Dependencies for recalculation


  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>My Properties</h1>
          <div className="header-actions">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleBulkImportClick}
              title="Import multiple properties from CSV"
            >
              <i className="fas fa-upload"></i>
              Bulk Import
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={handleAddPropertyClick}
              title="Add a single property"
            >
              <i className="fas fa-plus"></i>
              Add Property
            </button>
          </div>
        </div>
      </header>
      
      {/* Search and Filter Component */}
      <SearchAndFilter
        searchText={searchText}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
        resultCount={filteredAndSortedProperties.length}
        totalCount={properties.length}
      />


      {/* --- Property List --- */}
      <div className="property-list">
        {/* Render message or the filtered/sorted list */}
        {filteredAndSortedProperties.length === 0 ? (
          <div className="no-properties-message">
            {properties.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-home empty-icon"></i>
                <h3>No properties yet</h3>
                <p>Click the '+' button to add your first visited house!</p>
              </div>
            ) : (
              <div className="no-results">
                <i className="fas fa-search no-results-icon"></i>
                <h3>No properties match your filters</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button onClick={handleClearFilters} className="btn btn-secondary">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
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

      {/* --- Scroll to Top Button --- */}
      {showScroll && (
        <button onClick={scrollTop} className="scroll-to-top" title="Scroll to top">
          <i className="fas fa-arrow-up"></i>
        </button>
      )}

    </div> // End container
  );
}

export default Properties;