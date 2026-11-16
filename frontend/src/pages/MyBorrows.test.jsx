import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyBorrows from './MyBorrows';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('MyBorrows', () => {
  const recordsData = {
    data: {
      data: {
        items: [
          { id: 1, status: 'pending', book: { title: 'Book A', isbn: '111' }, expected_return_date: '2026-08-10T00:00:00', actual_return_date: null, reject_reason: null, book_id: 1 },
          { id: 2, status: 'borrowed', book_title: 'Book B', book_isbn: '222', expected_return_date: '2026-08-05T00:00:00', actual_return_date: null, reject_reason: null, book_id: 2 },
          { id: 3, status: 'rejected', book: { title: 'Book C', isbn: '333' }, expected_return_date: null, actual_return_date: null, reject_reason: '库存不足', book_id: 3 },
        ],
        pagination: { total: 30 },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockResolvedValue(recordsData);
  });

  it('renders borrow records with status tags', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
      </MemoryRouter>
    );

    expect(await screen.findByText('Book A')).toBeInTheDocument();
    expect(screen.getByText('待审核')).toBeInTheDocument();
    expect(screen.getByText('借阅中')).toBeInTheDocument();
    expect(screen.getByText('已拒绝')).toBeInTheDocument();
    expect(screen.getByText('库存不足')).toBeInTheDocument();
  });

  it('navigates to book detail when view button clicked', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const viewButtons = screen.getAllByText('查看图书');
    fireEvent.click(viewButtons[0]);
  });

  it('handles pagination change', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const nextPageButton = document.querySelector('.ant-pagination-next button');
    if (nextPageButton) {
      fireEvent.click(nextPageButton);
      await waitFor(() => {
        expect(request.get).toHaveBeenCalledWith(
          '/borrows/my',
          expect.objectContaining({
            params: expect.objectContaining({ page: 2 }),
          })
        );
      });
    }
  });

  it('shows fallback data fields', async () => {
    request.get.mockResolvedValue({
      data: {
        data: {
          items: [
            { id: 4, status: 'unknown', expected_return_date: null, actual_return_date: null, reject_reason: null, book_id: 4 },
          ],
          total: 1,
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
      </MemoryRouter>
    );

    expect(await screen.findByText('unknown')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('shows error when fetch fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
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
        <MyBorrows />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取借阅记录失败');
    });
  });

  it('handles array response and list fallback', async () => {
    request.get.mockResolvedValue({
      data: {
        data: [
          { id: 5, status: 'returned', book_title: 'Array Book', book_isbn: '555', expected_return_date: null, actual_return_date: '2026-08-01T00:00:00', reject_reason: null, book_id: 5 },
        ],
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
      </MemoryRouter>
    );

    expect(await screen.findByText('Array Book')).toBeInTheDocument();
    expect(screen.getByText('2026-08-01')).toBeInTheDocument();
  });

  it('handles empty object response', async () => {
    request.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyBorrows />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('我的借阅')).toBeInTheDocument();
    });
  });
});
