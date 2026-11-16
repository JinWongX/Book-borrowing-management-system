import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { login } from '../services/auth';

const mockGetCurrentUser = vi.fn();

vi.mock('../services/auth', () => ({
  login: vi.fn(),
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('../services/request', () => ({
  isTokenValid: (token) => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) return false;
      return true;
    } catch {
      return false;
    }
  },
  default: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

function TestConsumer() {
  const { user, loading, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user">{user ? user.username : 'null'}</span>
    </div>
  );
}

function TestActions() {
  const { login: doLogin, logout, role } = useAuth();
  return (
    <div>
      <span data-testid="role">{role || 'no-role'}</span>
      <button data-testid="login-btn" onClick={() => doLogin('admin', 'pass')}>
        登录
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        退出
      </button>
    </div>
  );
}

describe('AuthProvider expired token cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetCurrentUser.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears expired token and keeps user unauthenticated', async () => {
    const expiredToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.signature`;
    localStorage.setItem('token', expiredToken);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('authenticated').textContent).toBe('no');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('clears invalid token and keeps user unauthenticated', async () => {
    localStorage.setItem('token', 'malformed-token');

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });

  it('fetches current user when token is valid', async () => {
    const validToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
    localStorage.setItem('token', validToken);
    mockGetCurrentUser.mockResolvedValue({ data: { data: { id: 1, username: 'employee' } } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    expect(screen.getByTestId('user').textContent).toBe('employee');
  });

  it('clears token when current user request fails', async () => {
    const validToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
    localStorage.setItem('token', validToken);
    mockGetCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });
});

describe('AuthProvider login and logout', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetCurrentUser.mockReset();
    login.mockReset && login.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('login stores token, fetches user and exposes role', async () => {
    const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
    login.mockResolvedValue({ data: { data: { access_token: token } } });
    mockGetCurrentUser.mockResolvedValue({
      data: { data: { id: 1, username: 'admin', role: { name: 'admin' } } },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TestActions />
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    });

    expect(login).toHaveBeenCalledWith('admin', 'pass');
    expect(localStorage.getItem('token')).toBe(token);
    expect(screen.getByTestId('user').textContent).toBe('admin');
    expect(screen.getByTestId('role').textContent).toBe('admin');
  });

  it('logout clears token and resets user', async () => {
    const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
    localStorage.setItem('token', token);
    mockGetCurrentUser.mockResolvedValue({
      data: { data: { id: 1, username: 'librarian', role: { name: 'librarian' } } },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TestActions />
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('yes');
    });

    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('no');
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('user').textContent).toBe('null');
  });
});
