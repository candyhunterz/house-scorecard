// Property Status Constants and Configuration

export const PROPERTY_STATUSES = {
  UNSET: null, // No status selected yet
  INTERESTED: 'interested',
  VIEWING_SCHEDULED: 'viewing_scheduled', 
  VIEWED: 'viewed',
  OFFER_MADE: 'offer_made',
  UNDER_CONTRACT: 'under_contract',
  CLOSED: 'closed',
  PASSED: 'passed'
};

export const STATUS_CONFIG = {
  [PROPERTY_STATUSES.UNSET]: {
    label: 'Set Status',
    color: '#e9ecef', // light gray
    icon: 'fas fa-question-circle',
    description: 'Click to set property status',
    order: 0
  },
  [PROPERTY_STATUSES.INTERESTED]: {
    label: 'Interested',
    color: '#17a2b8', // info blue
    icon: 'fas fa-heart',
    description: 'Property caught your interest',
    order: 1
  },
  [PROPERTY_STATUSES.VIEWING_SCHEDULED]: {
    label: 'Viewing Scheduled',
    color: '#ffc107', // warning yellow
    icon: 'fas fa-calendar-alt',
    description: 'Viewing appointment scheduled',
    order: 2
  },
  [PROPERTY_STATUSES.VIEWED]: {
    label: 'Viewed',
    color: '#6f42c1', // purple
    icon: 'fas fa-eye',
    description: 'Property has been viewed',
    order: 3
  },
  [PROPERTY_STATUSES.OFFER_MADE]: {
    label: 'Offer Made',
    color: '#fd7e14', // orange
    icon: 'fas fa-handshake',
    description: 'Offer submitted',
    order: 4
  },
  [PROPERTY_STATUSES.UNDER_CONTRACT]: {
    label: 'Under Contract',
    color: '#20c997', // teal
    icon: 'fas fa-file-contract',
    description: 'Offer accepted, under contract',
    order: 5
  },
  [PROPERTY_STATUSES.CLOSED]: {
    label: 'Closed',
    color: '#28a745', // success green
    icon: 'fas fa-check-circle',
    description: 'Purchase completed',
    order: 6
  },
  [PROPERTY_STATUSES.PASSED]: {
    label: 'Passed',
    color: '#6c757d', // gray
    icon: 'fas fa-times-circle',
    description: 'Decided not to pursue',
    order: 7
  }
};

// Helper functions
export const getStatusConfig = (status) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG[PROPERTY_STATUSES.UNSET];
};

export const getStatusLabel = (status) => {
  return getStatusConfig(status).label;
};

export const getStatusColor = (status) => {
  return getStatusConfig(status).color;
};

export const getStatusIcon = (status) => {
  return getStatusConfig(status).icon;
};

export const getStatusDescription = (status) => {
  return getStatusConfig(status).description;
};

// Get all statuses ordered by progression
export const getAllStatuses = () => {
  return Object.keys(STATUS_CONFIG)
    .sort((a, b) => STATUS_CONFIG[a].order - STATUS_CONFIG[b].order)
    .map(key => ({
      value: key,
      ...STATUS_CONFIG[key]
    }));
};

// Check if status represents active interest
export const isActiveStatus = (status) => {
  return [
    PROPERTY_STATUSES.INTERESTED,
    PROPERTY_STATUSES.VIEWING_SCHEDULED,
    PROPERTY_STATUSES.VIEWED,
    PROPERTY_STATUSES.OFFER_MADE,
    PROPERTY_STATUSES.UNDER_CONTRACT
  ].includes(status);
};

// Check if status is final
export const isFinalStatus = (status) => {
  return [
    PROPERTY_STATUSES.CLOSED,
    PROPERTY_STATUSES.PASSED
  ].includes(status);
};