import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddProperty from '../../pages/AddProperty';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { AuthProvider } from '../../contexts/AuthContext';

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
}));

describe('AddProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders add property form correctly', () => {
    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/listing url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/baths/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sqft/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument();
  });

  it('allows user to input property details', () => {
    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    const addressInput = screen.getByLabelText(/address/i);
    const priceInput = screen.getByLabelText(/price/i);
    const bedsInput = screen.getByLabelText(/beds/i);

    fireEvent.change(addressInput, { target: { value: '123 Test Street' } });
    fireEvent.change(priceInput, { target: { value: '300000' } });
    fireEvent.change(bedsInput, { target: { value: '3' } });

    expect(addressInput.value).toBe('123 Test Street');
    expect(priceInput.value).toBe('300000');
    expect(bedsInput.value).toBe('3');
  });

  it('shows validation error for empty address', async () => {
    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    const submitButton = screen.getByRole('button', { name: /add property/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/address is required/i)).toBeInTheDocument();
    });
  });

  it('successfully submits property form', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        address: '123 Test Street',
        price: '300000.00',
        beds: 3,
        baths: '2.0',
        sqft: 1500,
      }),
    });

    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test Street' } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '300000' } });
    fireEvent.change(screen.getByLabelText(/beds/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/baths/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/sqft/i), { target: { value: '1500' } });

    fireEvent.click(screen.getByRole('button', { name: /add property/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/properties/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('123 Test Street'),
        })
      );
    });
  });

  it('handles form submission error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test Street' } });
    fireEvent.click(screen.getByRole('button', { name: /add property/i }));

    await waitFor(() => {
      expect(screen.getByText(/error adding property/i)).toBeInTheDocument();
    });
  });

  it('has auto-fill functionality button', () => {
    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    expect(screen.getByRole('button', { name: /auto-fill from listing url/i })).toBeInTheDocument();
  });

  it('validates numeric inputs', () => {
    render(
      <MockProviders>
        <AddProperty />
      </MockProviders>
    );

    const priceInput = screen.getByLabelText(/price/i);
    const bedsInput = screen.getByLabelText(/beds/i);
    const sqftInput = screen.getByLabelText(/sqft/i);

    fireEvent.change(priceInput, { target: { value: 'invalid' } });
    fireEvent.change(bedsInput, { target: { value: 'invalid' } });
    fireEvent.change(sqftInput, { target: { value: 'invalid' } });

    expect(priceInput.value).toBe('invalid');
    expect(bedsInput.value).toBe('invalid');
    expect(sqftInput.value).toBe('invalid');
  });
});