import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Statistics from './Statistics';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('Statistics', () => {
  const mockStatistics = {
    data: {
      data: {
        items: [
          { id: 1, name: 'Book A', borrow_count: 10 },
          { id: 2, name: 'Book B', borrow_count: 5 },
        ],
        total: 2,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockImplementation((url) => {
      if (url === '/statistics/books') return Promise.resolve(mockStatistics);
      if (url === '/statistics/categories') return Promise.resolve(mockStatistics);
      if (url === '/statistics/departments') return Promise.resolve({
        data: { data: { items: [{ id: 1, name: null, borrow_count: 3 }], total: 1 } },
      });
      if (url === '/statistics/users') return Promise.resolve(mockStatistics);
      if (url === '/statistics/top20') return Promise.resolve(mockStatistics);
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders statistics tabs', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    expect(await screen.findByRole('tab', { name: /按图书统计/ })).toBeInTheDocument();
    expect(screen.getByText('Book A')).toBeInTheDocument();
  });

  it('handles list data as array', async () => {
    request.get.mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Direct A', borrow_count: 1 },
          { id: 2, name: 'Direct B', borrow_count: 2 },
        ],
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    expect(await screen.findByText('Direct A')).toBeInTheDocument();
  });

  it('handles list data with list field', async () => {
    request.get.mockResolvedValue({
      data: {
        data: {
          list: [
            { id: 1, name: 'List A', borrow_count: 1 },
          ],
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    expect(await screen.findByText('List A')).toBeInTheDocument();
  });

  it('switches tabs', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    await screen.findAllByText('按图书统计');

    fireEvent.click(screen.getAllByText('按分类统计')[0]);
    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith('/statistics/categories');
    });

    fireEvent.click(screen.getAllByText('按部门统计')[0]);
    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith('/statistics/departments');
    });
  });

  it('exports excel', async () => {
    request.get.mockResolvedValue({ data: new Blob(['excel']) });
    URL.createObjectURL = vi.fn(() => 'blob:url');
    URL.revokeObjectURL = vi.fn();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    await screen.findAllByText('按图书统计');

    fireEvent.click(screen.getAllByText('导出 Excel')[0]);

    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith(
        '/statistics/export',
        expect.objectContaining({
          params: { type: 'books', format: 'excel' },
          responseType: 'blob',
        })
      );
    });
  });

  it('exports csv', async () => {
    request.get.mockResolvedValue({ data: new Blob(['csv']) });
    URL.createObjectURL = vi.fn(() => 'blob:url');
    URL.revokeObjectURL = vi.fn();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    await screen.findAllByText('按图书统计');

    fireEvent.click(screen.getAllByText('导出 CSV')[0]);

    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith(
        '/statistics/export',
        expect.objectContaining({
          params: { type: 'books', format: 'csv' },
          responseType: 'blob',
        })
      );
    });
  });

  it('shows error when export fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '导出失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    await screen.findAllByText('按图书统计');

    fireEvent.click(screen.getAllByText('导出 Excel')[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('导出失败');
    });
  });

  it('shows error when fetch fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
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
        <Statistics />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取统计数据失败');
    });
  });

  it('shows default error message when export fails', async () => {
    request.get.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Statistics />
      </MemoryRouter>
    );

    await screen.findAllByText('按图书统计');

    fireEvent.click(screen.getAllByText('导出 Excel')[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('导出失败');
    });
  });
});
