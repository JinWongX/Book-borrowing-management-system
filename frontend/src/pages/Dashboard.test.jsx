import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

describe('Dashboard', () => {
  it('renders welcome message for employee', () => {
    useAuth.mockReturnValue({ user: { username: 'employee' }, role: 'employee' });

    render(<Dashboard />);

    expect(screen.getByText('您好，employee')).toBeInTheDocument();
    expect(screen.getByText('欢迎进入企业图书借阅系统，您可以浏览图书、发起借阅申请并查看个人借阅记录。')).toBeInTheDocument();
  });

  it('renders welcome message for librarian', () => {
    useAuth.mockReturnValue({ user: { username: 'librarian' }, role: 'librarian' });

    render(<Dashboard />);

    expect(screen.getByText('您好，librarian')).toBeInTheDocument();
    expect(screen.getByText('欢迎进入企业图书借阅系统，您可以管理图书、审核借阅、登记借还、查看逾期与统计报表。')).toBeInTheDocument();
  });

  it('renders default welcome message for unknown role', () => {
    useAuth.mockReturnValue({ user: { username: 'guest' }, role: 'guest' });

    render(<Dashboard />);

    expect(screen.getByText('您好，guest')).toBeInTheDocument();
    expect(screen.getByText('欢迎进入企业图书借阅系统。')).toBeInTheDocument();
  });

  it('renders fallback username when username is missing', () => {
    useAuth.mockReturnValue({ user: {}, role: 'employee' });

    render(<Dashboard />);

    expect(screen.getByText('您好，用户')).toBeInTheDocument();
  });

  it('renders fallback when user is null', () => {
    useAuth.mockReturnValue({ user: null, role: 'employee' });

    render(<Dashboard />);

    expect(screen.getByText('您好，用户')).toBeInTheDocument();
  });
});
