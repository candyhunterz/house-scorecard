import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock fetch
global.fetch = jest.fn();

const wrapper = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

describe('AuthContext', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  test('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  test('login successfully updates auth state', async () => {
    const mockToken = 'mock-jwt-token';
    const mockUser = { id: 1, username: 'testuser' };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: mockUser }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('auth_token')).toBe(mockToken);
  });

  test('login with invalid credentials shows error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const success = await result.current.login('invalid', 'credentials');
      expect(success).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('logout clears auth state', async () => {
    // Setup authenticated state
    const mockToken = 'mock-jwt-token';
    const mockUser = { id: 1, username: 'testuser' };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: mockUser }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    // Now logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  test('loads token from localStorage on initialization', () => {
    const mockToken = 'stored-token';
    localStorage.setItem('auth_token', mockToken);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('handles network errors during login', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const success = await result.current.login('testuser', 'password');
      expect(success).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  test('throws error when useAuth is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});