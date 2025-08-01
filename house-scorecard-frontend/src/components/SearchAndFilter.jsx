import React, { useState } from 'react';
import { StatusFilter } from './PropertyStatus';
import './SearchAndFilter.css';

function SearchAndFilter({ 
    searchText, 
    onSearchChange, 
    filters, 
    onFiltersChange, 
    sortBy, 
    onSortChange,
    onClearFilters,
    resultCount,
    totalCount
}) {
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const handleFilterChange = (filterName, value) => {
        onFiltersChange({
            ...filters,
            [filterName]: value
        });
    };

    const toggleAdvancedFilters = () => {
        setShowAdvancedFilters(!showAdvancedFilters);
    };

    const hasActiveFilters = () => {
        return filters.minPrice || filters.maxPrice || 
               filters.minScore || filters.maxScore ||
               filters.minBeds || filters.maxBeds ||
               filters.minBaths || filters.maxBaths ||
               filters.minSqft || filters.maxSqft ||
               filters.mustHavesMet || filters.dealBreakersPresent !== null ||
               (filters.statuses && filters.statuses.length > 0);
    };

    return (
        <div className="search-and-filter">
            {/* Main Search Bar and Controls */}
            <div className="search-controls">
                <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="Search by address, notes, or location..."
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="search-input"
                    />
                    {searchText && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="clear-search-btn"
                            title="Clear search"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                <div className="control-buttons">
                    <StatusFilter
                        selectedStatuses={filters.statuses || []}
                        onStatusFilterChange={(statuses) => handleFilterChange('statuses', statuses)}
                    />

                    <button
                        onClick={toggleAdvancedFilters}
                        className={`filter-toggle-btn ${showAdvancedFilters ? 'active' : ''}`}
                        title="Toggle advanced filters"
                    >
                        <i className="fas fa-filter"></i>
                        Filters
                        {hasActiveFilters() && <span className="filter-count-badge"></span>}
                    </button>

                    <select 
                        value={sortBy} 
                        onChange={(e) => onSortChange(e.target.value)} 
                        className="sort-select"
                    >
                        <option value="score_desc">Score: High → Low</option>
                        <option value="score_asc">Score: Low → High</option>
                        <option value="price_asc">Price: Low → High</option>
                        <option value="price_desc">Price: High → Low</option>
                        <option value="address_asc">Address: A → Z</option>
                        <option value="address_desc">Address: Z → A</option>
                    </select>
                </div>
            </div>

            {/* Results Summary */}
            <div className="results-summary">
                <span className="results-count">
                    {resultCount === totalCount 
                        ? `${totalCount} properties` 
                        : `${resultCount} of ${totalCount} properties`
                    }
                </span>
                {hasActiveFilters() && (
                    <button 
                        onClick={onClearFilters}
                        className="clear-filters-btn"
                    >
                        <i className="fas fa-times"></i> Clear filters
                    </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <div className="advanced-filters">
                    <div className="filters-grid">
                        {/* Price Range */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <i className="fas fa-dollar-sign"></i> Price Range
                            </label>
                            <div className="range-inputs">
                                <input
                                    type="number"
                                    placeholder="Min price"
                                    value={filters.minPrice || ''}
                                    onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                                <span className="range-separator">to</span>
                                <input
                                    type="number"
                                    placeholder="Max price"
                                    value={filters.maxPrice || ''}
                                    onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                            </div>
                        </div>

                        {/* Score Range */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <i className="fas fa-star"></i> Score Range
                            </label>
                            <div className="range-inputs">
                                <input
                                    type="number"
                                    placeholder="Min score"
                                    min="0"
                                    max="100"
                                    value={filters.minScore || ''}
                                    onChange={(e) => handleFilterChange('minScore', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                                <span className="range-separator">to</span>
                                <input
                                    type="number"
                                    placeholder="Max score"
                                    min="0"
                                    max="100"
                                    value={filters.maxScore || ''}
                                    onChange={(e) => handleFilterChange('maxScore', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                            </div>
                        </div>

                        {/* Bedrooms */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <i className="fas fa-bed"></i> Bedrooms
                            </label>
                            <div className="range-inputs">
                                <input
                                    type="number"
                                    placeholder="Min beds"
                                    min="0"
                                    value={filters.minBeds || ''}
                                    onChange={(e) => handleFilterChange('minBeds', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                                <span className="range-separator">to</span>
                                <input
                                    type="number"
                                    placeholder="Max beds"
                                    min="0"
                                    value={filters.maxBeds || ''}
                                    onChange={(e) => handleFilterChange('maxBeds', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                            </div>
                        </div>

                        {/* Bathrooms */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <i className="fas fa-bath"></i> Bathrooms
                            </label>
                            <div className="range-inputs">
                                <input
                                    type="number"
                                    placeholder="Min baths"
                                    min="0"
                                    step="0.5"
                                    value={filters.minBaths || ''}
                                    onChange={(e) => handleFilterChange('minBaths', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                                <span className="range-separator">to</span>
                                <input
                                    type="number"
                                    placeholder="Max baths"
                                    min="0"
                                    step="0.5"
                                    value={filters.maxBaths || ''}
                                    onChange={(e) => handleFilterChange('maxBaths', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                            </div>
                        </div>

                        {/* Square Footage */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <i className="fas fa-home"></i> Square Feet
                            </label>
                            <div className="range-inputs">
                                <input
                                    type="number"
                                    placeholder="Min sqft"
                                    min="0"
                                    value={filters.minSqft || ''}
                                    onChange={(e) => handleFilterChange('minSqft', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                                <span className="range-separator">to</span>
                                <input
                                    type="number"
                                    placeholder="Max sqft"
                                    min="0"
                                    value={filters.maxSqft || ''}
                                    onChange={(e) => handleFilterChange('maxSqft', e.target.value ? Number(e.target.value) : null)}
                                    className="range-input"
                                />
                            </div>
                        </div>

                        {/* Criteria-based Filters */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <i className="fas fa-check-circle"></i> Criteria Status
                            </label>
                            <div className="checkbox-filters">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.mustHavesMet || false}
                                        onChange={(e) => handleFilterChange('mustHavesMet', e.target.checked ? true : null)}
                                    />
                                    Must-haves satisfied
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.dealBreakersPresent === false}
                                        onChange={(e) => handleFilterChange('dealBreakersPresent', e.target.checked ? false : null)}
                                    />
                                    No deal-breakers
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchAndFilter;