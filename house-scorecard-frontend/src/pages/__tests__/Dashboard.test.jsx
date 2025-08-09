import React from 'react';
import { screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { renderWithProviders, createMockProperty } from '../../../tests/utils/test-wrappers';

// Mock the dashboard context with sample data
const mockDashboardData = {
  properties: [
    createMockProperty({ id: 1, status: 'active', score: 85 }),
    createMockProperty({ id: 2, status: 'viewed', score: 72 }),
    createMockProperty({ id: 3, status: 'rejected', score: 45 }),
    createMockProperty({ id: 4, status: 'active', score: 90 }),
  ],
  criteria: [
    { id: 1, type: 'mustHave', text: 'Good schools' },
    { id: 2, type: 'niceToHave', text: 'Swimming pool' },
    { id: 3, type: 'dealBreaker', text: 'Busy street' },
  ],
  loading: false,
  error: null,
};

jest.mock('../../contexts/PropertyContext', () => ({
  useProperties: () => mockDashboardData,
}));

describe('Dashboard', () => {
  test('renders dashboard statistics correctly', () => {
    renderWithProviders(<Dashboard />);

    // Check for property count
    expect(screen.getByText(/4\s*properties/i)).toBeInTheDocument();

    // Check for active properties count
    expect(screen.getByText(/2\s*active/i)).toBeInTheDocument();

    // Check for average score if displayed
    const avgScore = (85 + 72 + 45 + 90) / 4;
    expect(screen.getByText(new RegExp(`${avgScore.toFixed(1)}`, 'i'))).toBeInTheDocument();
  });

  test('displays quick actions', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Add Property')).toBeInTheDocument();
    expect(screen.getByText('Manage Criteria')).toBeInTheDocument();
    expect(screen.getByText('Compare Properties')).toBeInTheDocument();
  });

  test('shows property summary by status', () => {
    renderWithProviders(<Dashboard />);

    // Should show breakdown by status
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/viewed/i)).toBeInTheDocument();
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
  });

  test('displays recent properties section', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/recent properties/i)).toBeInTheDocument();

    // Should show some property addresses
    mockDashboardData.properties.slice(0, 3).forEach(property => {
      expect(screen.getByText(property.address)).toBeInTheDocument();
    });
  });

  test('shows criteria summary', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/3\s*criteria/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s*must.*have/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s*nice.*have/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s*deal.*breaker/i)).toBeInTheDocument();
  });

  test('navigation from dashboard works', () => {
    renderWithProviders(<Dashboard />);

    // Quick action buttons should have proper links
    const addPropertyBtn = screen.getByText('Add Property').closest('a');
    expect(addPropertyBtn).toHaveAttribute('href', '/add-property');

    const criteriaBtn = screen.getByText('Manage Criteria').closest('a');
    expect(criteriaBtn).toHaveAttribute('href', '/criteria');

    const compareBtn = screen.getByText('Compare Properties').closest('a');
    expect(compareBtn).toHaveAttribute('href', '/comparison');
  });

  test('handles empty state when no properties exist', () => {
    const emptyMockData = {
      ...mockDashboardData,
      properties: [],
    };

    jest.doMock('../../contexts/PropertyContext', () => ({
      useProperties: () => emptyMockData,
    }));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/0\s*properties/i)).toBeInTheDocument();
    expect(screen.getByText(/get started.*adding.*property/i)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    const loadingMockData = {
      ...mockDashboardData,
      loading: true,
    };

    jest.doMock('../../contexts/PropertyContext', () => ({
      useProperties: () => loadingMockData,
    }));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays error state when there is an error', () => {
    const errorMockData = {
      ...mockDashboardData,
      error: 'Failed to load dashboard data',
    };

    jest.doMock('../../contexts/PropertyContext', () => ({
      useProperties: () => errorMockData,
    }));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/error.*loading.*dashboard/i)).toBeInTheDocument();
  });

  test('shows score distribution chart or summary', () => {
    renderWithProviders(<Dashboard />);

    // Should show score ranges or distribution
    expect(screen.getByText(/score.*distribution/i)).toBeInTheDocument();

    // Check for score ranges
    expect(screen.getByText(/80-100/i)).toBeInTheDocument(); // Excellent
    expect(screen.getByText(/60-79/i)).toBeInTheDocument(); // Good
    expect(screen.getByText(/40-59/i)).toBeInTheDocument(); // Fair
  });
});