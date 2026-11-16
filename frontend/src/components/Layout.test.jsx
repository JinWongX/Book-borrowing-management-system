import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

const Dashboard = () => <div data-testid="dashboard">首页内容</div>;

describe('Layout', () => {
  const mockLogout = vi.fn();

  const renderLayout = (role) => {
    const user = { id: 1, username: 'testuser' };
    useAuth.mockReturnValue({ user, role, logout: mockLogout });

    return render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders header with user info', () => {
    renderLayout('librarian');

    expect(screen.getByText('企业图书借阅管理系统')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('(图书管理员)')).toBeInTheDocument();
  });

  it('renders menus filtered by employee role', () => {
    renderLayout('employee');

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('图书检索')).toBeInTheDocument();
    expect(screen.getByText('我的借阅')).toBeInTheDocument();
    expect(screen.queryByText('图书管理')).not.toBeInTheDocument();
    expect(screen.queryByText('借阅审核')).not.toBeInTheDocument();
  });

  it('renders management menus for librarian role', () => {
    renderLayout('librarian');

    expect(screen.getByText('图书管理')).toBeInTheDocument();
    expect(screen.getByText('借阅审核')).toBeInTheDocument();
    expect(screen.getByText('借还登记')).toBeInTheDocument();
    expect(screen.queryByText('我的借阅')).not.toBeInTheDocument();
    expect(screen.queryByText('用户管理')).not.toBeInTheDocument();
  });

  it('renders admin menus for admin role', () => {
    renderLayout('admin');

    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('角色权限')).toBeInTheDocument();
    expect(screen.getByText('统计报表')).toBeInTheDocument();
  });

  it('calls logout when exit button clicked', () => {
    renderLayout('employee');

    fireEvent.click(screen.getByText('退出登录'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('navigates when menu item clicked', async () => {
    const Books = () => <div data-testid="books-page">图书检索页面</div>;
    useAuth.mockReturnValue({ user: { id: 1, username: 'testuser' }, role: 'employee', logout: mockLogout });

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="books" element={<Books />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('图书检索')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('图书检索'));

    await waitFor(() => {
      expect(screen.getByTestId('books-page')).toBeInTheDocument();
    });
  });
});
