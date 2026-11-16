import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleRoute from './RoleRoute';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

const TestChild = () => <div data-testid="role-content">角色受限内容</div>;

describe('RoleRoute', () => {
  it('renders loading spinner when auth is loading', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, role: 'librarian', loading: true });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleRoute allowedRoles={['librarian']}>
          <TestChild />
        </RoleRoute>
      </MemoryRouter>
    );

    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders children when role is allowed', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, role: 'librarian', loading: false });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleRoute allowedRoles={['librarian', 'admin']}>
          <TestChild />
        </RoleRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('role-content')).toBeInTheDocument();
  });

  it('redirects to home when role is not allowed', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true, role: 'employee', loading: false });

    render(
      <MemoryRouter initialEntries={['/admin']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page">首页</div>} />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <TestChild />
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('role-content')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false, role: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/admin']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">登录页</div>} />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <TestChild />
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
