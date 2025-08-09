import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Criteria from '../../pages/Criteria';
import { CriteriaProvider } from '../../contexts/CriteriaContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { AuthProvider } from '../../contexts/AuthContext';

const mockCriteria = [
  {
    id: 1,
    text: 'Good schools nearby',
    type: 'niceToHave',
    weight: 8,
    rating_type: 'stars',
    category: 'Education',
  },
  {
    id: 2,
    text: 'Must have parking',
    type: 'mustHave',
    category: 'Essential',
  },
  {
    id: 3,
    text: 'No highway noise',
    type: 'dealBreaker',
    category: 'Environment',
  },
];

const MockProviders = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <CriteriaProvider>
          {children}
        </CriteriaProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Criteria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    
    // Mock fetch for getting criteria
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockCriteria }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders criteria page with sections', async () => {
    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/must-haves/i)).toBeInTheDocument();
      expect(screen.getByText(/nice-to-haves/i)).toBeInTheDocument();
      expect(screen.getByText(/deal breakers/i)).toBeInTheDocument();
    });
  });

  it('displays existing criteria in correct sections', async () => {
    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Good schools nearby')).toBeInTheDocument();
      expect(screen.getByText('Must have parking')).toBeInTheDocument();
      expect(screen.getByText('No highway noise')).toBeInTheDocument();
    });
  });

  it('allows adding new must-have criterion', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockCriteria }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 4,
          text: 'Must have garage',
          type: 'mustHave',
          category: 'Essential',
        }),
      });

    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/must-haves/i)).toBeInTheDocument();
    });

    // Find the must-have section form
    const mustHaveSection = screen.getByText(/must-haves/i).closest('.criterion-section');
    const textInput = mustHaveSection.querySelector('input[type="text"]');
    const addButton = mustHaveSection.querySelector('button[type="submit"]');

    fireEvent.change(textInput, { target: { value: 'Must have garage' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/criteria/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Must have garage'),
        })
      );
    });
  });

  it('allows adding new nice-to-have criterion with weight', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockCriteria }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 5,
          text: 'Close to grocery store',
          type: 'niceToHave',
          weight: 6,
          rating_type: 'yesNo',
        }),
      });

    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/nice-to-haves/i)).toBeInTheDocument();
    });

    // Find the nice-to-have section form
    const niceToHaveSection = screen.getByText(/nice-to-haves/i).closest('.criterion-section');
    const textInput = niceToHaveSection.querySelector('input[type="text"]');
    const weightInput = niceToHaveSection.querySelector('input[type="number"]');
    const addButton = niceToHaveSection.querySelector('button[type="submit"]');

    fireEvent.change(textInput, { target: { value: 'Close to grocery store' } });
    fireEvent.change(weightInput, { target: { value: '6' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/criteria/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringMatching(/Close to grocery store.*"weight":6/),
        })
      );
    });
  });

  it('validates empty criterion text', async () => {
    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/must-haves/i)).toBeInTheDocument();
    });

    const mustHaveSection = screen.getByText(/must-haves/i).closest('.criterion-section');
    const addButton = mustHaveSection.querySelector('button[type="submit"]');

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/criterion text cannot be empty/i)).toBeInTheDocument();
    });
  });

  it('validates weight range for nice-to-have criteria', async () => {
    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/nice-to-haves/i)).toBeInTheDocument();
    });

    const niceToHaveSection = screen.getByText(/nice-to-haves/i).closest('.criterion-section');
    const textInput = niceToHaveSection.querySelector('input[type="text"]');
    const weightInput = niceToHaveSection.querySelector('input[type="number"]');
    const addButton = niceToHaveSection.querySelector('button[type="submit"]');

    fireEvent.change(textInput, { target: { value: 'Test criterion' } });
    fireEvent.change(weightInput, { target: { value: '15' } }); // Invalid weight
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/weight must be a number between 1 and 10/i)).toBeInTheDocument();
    });
  });

  it('allows deleting criterion', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockCriteria }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Good schools nearby')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/criteria/1/'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('handles criterion addition error', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockCriteria }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/must-haves/i)).toBeInTheDocument();
    });

    const mustHaveSection = screen.getByText(/must-haves/i).closest('.criterion-section');
    const textInput = mustHaveSection.querySelector('input[type="text"]');
    const addButton = mustHaveSection.querySelector('button[type="submit"]');

    fireEvent.change(textInput, { target: { value: 'Test criterion' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/error adding criterion/i)).toBeInTheDocument();
    });
  });

  it('displays criterion categories and weights correctly', async () => {
    render(
      <MockProviders>
        <Criteria />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Good schools nearby')).toBeInTheDocument();
    });

    // Check that weight is displayed for nice-to-have
    expect(screen.getByText(/weight.*8/i)).toBeInTheDocument();
    // Check that category is displayed
    expect(screen.getByText(/education/i)).toBeInTheDocument();
  });
});