import React, { useState } from 'react';
import { getStatusConfig, getAllStatuses, PROPERTY_STATUSES } from '../constants/propertyStatus';
import { useToast } from '../contexts/ToastContext';
import './PropertyStatus.css';

// Status Badge Component - displays current status
export function StatusBadge({ status, size = 'normal', showIcon = true, showLabel = true }) {
    const config = getStatusConfig(status);
    
    return (
        <div className={`status-badge status-badge-${size}`} style={{ backgroundColor: config.color }}>
            {showIcon && <i className={config.icon}></i>}
            {showLabel && <span className="status-label">{config.label}</span>}
        </div>
    );
}

// Status Selector Component - dropdown for changing status
export function StatusSelector({ 
    currentStatus, 
    onStatusChange, 
    disabled = false, 
    size = 'normal',
    showCurrentBadge = true 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { showSuccess } = useToast();
    const statuses = getAllStatuses();
    const currentConfig = getStatusConfig(currentStatus);

    const handleStatusSelect = (newStatus) => {
        if (newStatus !== currentStatus) {
            onStatusChange(newStatus);
            showSuccess(`Status updated to "${getStatusConfig(newStatus).label}"`);
        }
        setIsOpen(false);
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={`status-selector status-selector-${size} ${disabled ? 'disabled' : ''}`}>
            {showCurrentBadge && (
                <div className="current-status" onClick={toggleDropdown}>
                    <StatusBadge status={currentStatus} size={size} />
                    {!disabled && <i className="fas fa-chevron-down dropdown-arrow"></i>}
                </div>
            )}
            
            {!showCurrentBadge && (
                <button 
                    className="status-select-button"
                    onClick={toggleDropdown}
                    disabled={disabled}
                >
                    <i className={currentConfig.icon}></i>
                    <span>{currentConfig.label}</span>
                    <i className="fas fa-chevron-down dropdown-arrow"></i>
                </button>
            )}

            {isOpen && (
                <div className="status-dropdown">
                    <div className="status-dropdown-header">
                        <span>Update Status</span>
                        <button 
                            className="close-dropdown"
                            onClick={() => setIsOpen(false)}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="status-options">
                        {statuses.map(status => (
                            <div
                                key={status.value}
                                className={`status-option ${status.value === currentStatus ? 'current' : ''}`}
                                onClick={() => handleStatusSelect(status.value)}
                            >
                                <div className="status-option-badge">
                                    <i className={status.icon} style={{ color: status.color }}></i>
                                    <span className="status-option-label">{status.label}</span>
                                </div>
                                <div className="status-option-description">
                                    {status.description}
                                </div>
                                {status.value === currentStatus && (
                                    <i className="fas fa-check current-indicator"></i>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Status History Component - shows status changes over time
export function StatusHistory({ statusHistory = [] }) {
    if (!statusHistory || statusHistory.length === 0) {
        return (
            <div className="status-history empty">
                <p>No status changes recorded</p>
            </div>
        );
    }

    // Sort by date descending (most recent first)
    const sortedHistory = [...statusHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="status-history">
            <h4 className="status-history-title">
                <i className="fas fa-history"></i> Status History
            </h4>
            <div className="status-timeline">
                {sortedHistory.map((entry, index) => {
                    const config = getStatusConfig(entry.status);
                    const date = new Date(entry.date);
                    
                    return (
                        <div key={index} className="status-timeline-item">
                            <div className="status-timeline-badge" style={{ backgroundColor: config.color }}>
                                <i className={config.icon}></i>
                            </div>
                            <div className="status-timeline-content">
                                <div className="status-timeline-header">
                                    <span className="status-name">{config.label}</span>
                                    <span className="status-date">
                                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {entry.notes && (
                                    <div className="status-timeline-notes">
                                        {entry.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Status Filter Component - for filtering properties by status
export function StatusFilter({ selectedStatuses = [], onStatusFilterChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const statuses = getAllStatuses();

    const handleStatusToggle = (statusValue) => {
        const newSelected = selectedStatuses.includes(statusValue)
            ? selectedStatuses.filter(s => s !== statusValue)
            : [...selectedStatuses, statusValue];
        
        onStatusFilterChange(newSelected);
    };

    const clearAll = () => {
        onStatusFilterChange([]);
    };

    const selectAll = () => {
        onStatusFilterChange(statuses.map(s => s.value));
    };

    return (
        <div className="status-filter">
            <button 
                className={`status-filter-toggle ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <i className="fas fa-flag"></i>
                Status ({selectedStatuses.length})
                <i className="fas fa-chevron-down"></i>
            </button>

            {isOpen && (
                <div className="status-filter-dropdown">
                    <div className="status-filter-header">
                        <span>Filter by Status</span>
                        <div className="status-filter-actions">
                            <button onClick={selectAll} className="filter-action">All</button>
                            <button onClick={clearAll} className="filter-action">None</button>
                        </div>
                    </div>
                    <div className="status-filter-options">
                        {statuses.map(status => (
                            <label key={status.value} className="status-filter-option">
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status.value)}
                                    onChange={() => handleStatusToggle(status.value)}
                                />
                                <div className="status-filter-badge">
                                    <i className={status.icon} style={{ color: status.color }}></i>
                                    <span>{status.label}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default {
    StatusBadge,
    StatusSelector,
    StatusHistory,
    StatusFilter
};