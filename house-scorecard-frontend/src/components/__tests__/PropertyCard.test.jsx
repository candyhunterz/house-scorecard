import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockProperty } from '../../../tests/utils/test-wrappers';
import PropertyCard from '../PropertyCard';

describe('PropertyCard', () => {
  const mockProperty = createMockProperty({
    id: 1,
    address: '123 Main St',
    price: 300000,
    beds: 3,
    baths: 2.5,
    sqft: 1500,
    score: 85,
    imageUrls: ['http://example.com/image1.jpg'],
  });

  it('renders property details correctly', () => {
    renderWithProviders(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('$300,000')).toBeInTheDocument();
    expect(screen.getByText('3 Beds')).toBeInTheDocument();
    expect(screen.getByText('2.5 Baths')).toBeInTheDocument();
    expect(screen.getByText(/1500\s*sqft/i)).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByTestId('property-image')).toHaveAttribute('src', mockProperty.imageUrls[0]);
  });

  it('renders default values for missing data', () => {
    const incompleteProperty = createMockProperty({
      id: 2,
      address: '456 Oak Ave',
      price: null,
      beds: null,
      baths: null,
      sqft: null,
      score: null,
      imageUrls: [],
    });
    renderWithProviders(<PropertyCard property={incompleteProperty} />);

    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument(); // For price
    expect(screen.getByText('--')).toBeInTheDocument(); // For score
    expect(screen.getByTestId('property-placeholder-icon')).toBeInTheDocument();
  });
});