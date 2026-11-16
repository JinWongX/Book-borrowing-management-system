import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverdueList from './OverdueList';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('OverdueList', () => {
  const overdueData = {
    data: {
      data: {
        items: [
          { id: 1, user: { username: 'user1', department: 'Tech' }, book: { title: 'Book A', isbn: '111' }, expected_return_date: '2026-08-01T00:00:00', overdue_days: 4, status: 'borrowed', book_id: 1 },
          { id: 2, user_name: 'user2', department: 'HR', book_title: 'Book B', book_isbn: '222', expected_return_date: '2026-07-30T00:00:00', overdue_days: 6, status: 'borrowed', book_id: 2 },
        ],
        pagination: { total: 20 },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockResolvedValue(overdueData);
  });

  it('renders overdue list with days tag', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Book A')).toBeInTheDocument();
    expect(screen.getByText('4 天')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('renders fallback fields', async () => {
    request.get.mockResolvedValue({
      data: {
        data: {
          items: [
            { id: 3, expected_return_date: '2026-08-01T00:00:00', overdue_days: 1, status: 'unknown', book_id: 3 },
          ],
          total: 1,
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    expect(await screen.findByText('unknown')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('navigates to book detail', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const viewButtons = screen.getAllByText('查看图书');
    fireEvent.click(viewButtons[0]);
  });

  it('handles pagination change', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const nextPageButton = document.querySelector('.ant-pagination-next button');
    if (nextPageButton) {
      fireEvent.click(nextPageButton);
      await waitFor(() => {
        expect(request.get).toHaveBeenCalledWith(
          '/overdue',
          expect.objectContaining({
            params: expect.objectContaining({ page: 2 }),
          })
        );
      });
    }
  });

  it('shows error when fetch fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('加载失败');
    });
  });

  it('shows default error message when fetch fails', async () => {
    request.get.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取逾期列表失败');
    });
  });

  it('handles array response and missing overdue days', async () => {
    request.get.mockResolvedValue({
      data: {
        data: [
          { id: 4, user_name: 'user3', department: 'Finance', book_title: 'Book D', book_isbn: '444', expected_return_date: '2026-08-01T00:00:00', overdue_days: undefined, status: 'borrowed', book_id: 4 },
        ],
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Book D')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('handles empty object response', async () => {
    request.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverdueList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('逾期列表')).toBeInTheDocument();
    });
  });
});
