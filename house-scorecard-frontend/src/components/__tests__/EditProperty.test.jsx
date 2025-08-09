import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EditProperty from '../../pages/EditProperty';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { AuthProvider } from '../../contexts/AuthContext';

const mockProperty = {
  id: 1,
  address: '123 Original Street',
  price: '300000.00',
  beds: 3,
  baths: '2.5',
  sqft: 1500,
  notes: 'Original notes',
  imageUrls: ['http://example.com/image1.jpg'],
};

const MockProviders = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <PropertyProvider>
          {children}
        </PropertyProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('EditProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
    // Mock fetch for getting property details
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockProperty,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads and displays property data', async () => {
    render(
      <MockProviders>
        <EditProperty />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Original Street')).toBeInTheDocument();
      expect(screen.getByDisplayValue('300000.00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1500')).toBeInTheDocument();
    });
  });

  it('allows editing property fields', async () => {
    render(
      <MockProviders>
        <EditProperty />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Original Street')).toBeInTheDocument();
    });

    const addressInput = screen.getByDisplayValue('123 Original Street');
    fireEvent.change(addressInput, { target: { value: '456 Updated Street' } });

    expect(addressInput.value).toBe('456 Updated Street');
  });

  it('submits updated property data', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProperty,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockProperty, address: '456 Updated Street' }),
      });

    render(
      <MockProviders>
        <EditProperty />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Original Street')).toBeInTheDocument();
    });

    const addressInput = screen.getByDisplayValue('123 Original Street');
    fireEvent.change(addressInput, { target: { value: '456 Updated Street' } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/properties/1/'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('456 Updated Street'),
        })
      );
    });
  });

  it('handles update error', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProperty,
      })
      .mockRejectedValueOnce(new Error('Update failed'));

    render(
      <MockProviders>
        <EditProperty />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Original Street')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/error updating property/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching property', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <MockProviders>
        <EditProperty />
      </MockProviders>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('has cancel button that navigates back', async () => {
    render(
      <MockProviders>
        <EditProperty />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Original Street')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});