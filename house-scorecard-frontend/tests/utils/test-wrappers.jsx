import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock contexts
jest.mock('../../src/contexts/PropertyContext', () => ({
  useProperties: () => ({
    properties: [],
    addProperty: jest.fn(),
    updateProperty: jest.fn(),
    deleteProperty: jest.fn(),
    loading: false,
    error: null,
  }),
  PropertyProvider: ({ children }) => <div data-testid="property-provider">{children}</div>
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser' },
    token: 'mock-token',
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
    authenticatedFetch: jest.fn(),
  }),
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>
}));

jest.mock('../../src/contexts/CriteriaContext', () => ({
  useCriteria: () => ({
    mustHaves: [],
    niceToHaves: [],
    dealBreakers: [],
    addCriterion: jest.fn(),
    updateCriterion: jest.fn(),
    deleteCriterion: jest.fn(),
    loading: false,
    error: null,
  }),
  CriteriaProvider: ({ children }) => <div data-testid="criteria-provider">{children}</div>
}));

jest.mock('../../src/contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
  ToastProvider: ({ children }) => <div data-testid="toast-provider">{children}</div>
}));

// Mock implementations for contexts
const mockAuthContext = {
  user: { id: 1, username: 'testuser' },
  token: 'mock-token',
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  authenticatedFetch: jest.fn(),
};

const mockPropertyContext = {
  properties: [],
  addProperty: jest.fn(),
  updateProperty: jest.fn(),
  deleteProperty: jest.fn(),
  loading: false,
  error: null,
};

// Wrapper that provides all necessary contexts for testing
export const AllTheProviders = ({ children, initialEntries = ['/'] }) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

// Custom render function that includes providers
export const renderWithProviders = (ui, options = {}) => {
  const { initialEntries, ...renderOptions } = options;
  
  const Wrapper = ({ children }) => (
    <AllTheProviders initialEntries={initialEntries}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Custom render with only router (for components that don't need other contexts)
export const renderWithRouter = (ui, options = {}) => {
  const { initialEntries = ['/'], ...renderOptions } = options;
  
  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock implementations for common hooks
export const mockUseProperties = () => mockPropertyContext;
export const mockUseAuth = () => mockAuthContext;

// Helper to create mock properties
export const createMockProperty = (overrides = {}) => ({
  id: 1,
  address: '123 Test Street, Test City',
  price: 500000,
  beds: 3,
  baths: 2,
  sqft: 1500,
  lot_size: 0.25,
  year_built: 2020,
  property_type: 'House',
  status: 'active',
  score: 85,
  imageUrls: [],
  ai_analysis: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create mock criteria
export const createMockCriterion = (overrides = {}) => ({
  id: 1,
  text: 'Good schools nearby',
  type: 'mustHave',
  weight: 8,
  category: 'Location',
  scale_type: 'scale10',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});