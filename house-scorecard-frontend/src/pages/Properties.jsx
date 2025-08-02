import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import SearchAndFilter from '../components/SearchAndFilter';
import { useProperties } from '../contexts/PropertyContext';
import { useCriteria } from '../contexts/CriteriaContext';
import './Properties.css';

function Properties() {
  const { properties } = useProperties();
  const { mustHaves, dealBreakers } = useCriteria();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState('score_desc');
  const [searchText, setSearchText] = useState('');
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

  const checkScrollTop = () => {
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

  const handleSortChange = (newSortBy) => setSortBy(newSortBy);
  const handleSearchChange = (newSearchText) => setSearchText(newSearchText);
  const handleFiltersChange = (newFilters) => setFilters(newFilters);

  const handleClearFilters = () => {
    setSearchText('');
    setFilters({
      minPrice: null, maxPrice: null, minScore: null, maxScore: null,
      minBeds: null, maxBeds: null, minBaths: null, maxBaths: null,
      minSqft: null, maxSqft: null, mustHavesMet: null, dealBreakersPresent: null,
      statuses: []
    });
  };

  const handleAddPropertyClick = () => navigate('/add-property');
  const handleBulkImportClick = () => navigate('/bulk-import');
  const handleCardClick = (propertyId) => navigate(`/properties/${propertyId}`);

  const checkCriteriaStatus = (property) => {
    const ratings = property.ratings || {};
    const mustHavesMet = mustHaves.length === 0 || mustHaves.every(mh => ratings[mh.id] === true);
    const hasDealBreakers = dealBreakers.some(db => ratings[db.id] === true);
    return { mustHavesMet, hasDealBreakers };
  };

  const getFilteredAndSortedProperties = () => {
    const lowerCaseSearch = searchText.toLowerCase();

    const filtered = properties.filter(prop => {
      const matchesSearch = !searchText || 
        prop.address?.toLowerCase().includes(lowerCaseSearch) ||
        prop.notes?.toLowerCase().includes(lowerCaseSearch);

      if (!matchesSearch) return false;
      if (filters.minPrice && (prop.price === null || prop.price < filters.minPrice)) return false;
      if (filters.maxPrice && (prop.price === null || prop.price > filters.maxPrice)) return false;
      if (filters.minScore && (prop.score === null || prop.score < filters.minScore)) return false;
      if (filters.maxScore && (prop.score === null || prop.score > filters.maxScore)) return false;
      if (filters.minBeds && (prop.beds === null || prop.beds < filters.minBeds)) return false;
      if (filters.maxBeds && (prop.beds === null || prop.beds > filters.maxBeds)) return false;
      if (filters.minBaths && (prop.baths === null || prop.baths < filters.minBaths)) return false;
      if (filters.maxBaths && (prop.baths === null || prop.baths > filters.maxBaths)) return false;
      if (filters.minSqft && (prop.sqft === null || prop.sqft < filters.minSqft)) return false;
      if (filters.maxSqft && (prop.sqft === null || prop.sqft > filters.maxSqft)) return false;

      const { mustHavesMet, hasDealBreakers } = checkCriteriaStatus(prop);
      if (filters.mustHavesMet && !mustHavesMet) return false;
      if (filters.dealBreakersPresent === false && hasDealBreakers) return false;

      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(prop.status)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'score_desc': return (b.score ?? -1) - (a.score ?? -1);
        case 'score_asc': return (a.score ?? -1) - (b.score ?? -1);
        case 'price_desc': return (b.price ?? 0) - (a.price ?? 0);
        case 'price_asc': return (a.price ?? 0) - (b.price ?? 0);
        case 'address_asc': return (a.address || '').localeCompare(b.address || '');
        case 'address_desc': return (b.address || '').localeCompare(a.address || '');
        default: return 0;
      }
    });
  };

  const filteredAndSortedProperties = getFilteredAndSortedProperties(); // Dependencies for recalculation


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