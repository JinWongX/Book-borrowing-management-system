import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: vi.fn(() => ({
    user: { id: 1, username: 'librarian', role: { name: 'librarian' } },
    isAuthenticated: true,
    role: 'librarian',
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('./services/request', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: { items: [], total: 0 } } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('App routing', () => {
  it('renders login route', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(await screen.findByPlaceholderText('请输入用户名')).toBeInTheDocument();
  });

  it('renders dashboard for authenticated user', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByText('图书检索')).toBeInTheDocument();
  });

  it('renders book list route', async () => {
    window.history.pushState({}, '', '/books');
    render(<App />);
    const elements = await screen.findAllByText('图书检索');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders protected librarian route', async () => {
    window.history.pushState({}, '', '/borrow-review');
    render(<App />);
    const elements = await screen.findAllByText('借阅审核');
    expect(elements.length).toBeGreaterThan(0);
  });
});
