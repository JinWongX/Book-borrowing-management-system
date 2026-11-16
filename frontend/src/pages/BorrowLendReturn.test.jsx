import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BorrowLendReturn from './BorrowLendReturn';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('BorrowLendReturn', () => {
  const pendingData = {
    data: {
      data: {
        items: [
          { id: 1, status: 'pending', user: { username: 'user1' }, book: { title: 'Book A', isbn: '111' }, expected_return_date: '2026-08-10T00:00:00' },
        ],
      },
    },
  };

  const borrowedData = {
    data: {
      data: {
        items: [
          { id: 2, status: 'borrowed', user_name: 'user2', book_title: 'Book B', book_isbn: '222', expected_return_date: '2026-08-09T00:00:00' },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockImplementation((url, config) => {
      if (url === '/borrows/pending') return Promise.resolve(pendingData);
      if (url === '/borrows') return Promise.resolve(borrowedData);
      return Promise.resolve({ data: { data: {} } });
    });
    request.post.mockResolvedValue({ data: { data: {} } });
  });

  it('renders lend and return tabs', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    expect(await screen.findByText('待借出')).toBeInTheDocument();
    expect(await screen.findByText('Book A')).toBeInTheDocument();
  });

  it('registers lend by borrow id', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: 'BR000001' } });

    fireEvent.click(screen.getByText('借出登记'));

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith('/borrows/1/lend');
      expect(successSpy).toHaveBeenCalledWith('借出登记成功');
    });
  });

  it('registers return by raw id', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    fireEvent.click(screen.getByRole('tab', { name: /待归还/ }));

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: '2' } });

    fireEvent.click(screen.getByText('归还登记'));

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith('/borrows/2/return');
      expect(successSpy).toHaveBeenCalledWith('归还登记成功');
    });
  });

  it('warns when borrow id is invalid', async () => {
    const warningSpy = vi.spyOn(message, 'warning').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: 'invalid' } });

    fireEvent.click(screen.getByText('借出登记'));

    await waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith('请输入有效的借阅单号，如 BR000001');
    });
  });

  it('switches tab via row action', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    fireEvent.click(screen.getByText('借出'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
      expect(input.value).toBe('BR000001');
    });
  });

  it('switches to return tab via borrowed row action', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');
    fireEvent.click(screen.getByRole('tab', { name: /待归还/ }));

    await screen.findByText('Book B');

    fireEvent.click(screen.getByText('归还'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
      expect(input.value).toBe('BR000002');
    });
  });

  it('shows error when return fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '归还失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    fireEvent.click(screen.getByRole('tab', { name: /待归还/ }));

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: 'BR000002' } });

    fireEvent.click(screen.getByText('归还登记'));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('归还失败');
    });
  });

  it('shows error when operation fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '借出失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: 'BR000001' } });

    fireEvent.click(screen.getByText('借出登记'));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('借出失败');
    });
  });

  it('warns when borrow id is empty or whitespace', async () => {
    const warningSpy = vi.spyOn(message, 'warning').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: '   ' } });

    fireEvent.click(screen.getByText('借出登记'));

    await waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith('请输入有效的借阅单号，如 BR000001');
    });
  });

  it('shows default error when fetch pending fails', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/borrows/pending') return Promise.reject(new Error('network'));
      if (url === '/borrows') return Promise.resolve(borrowedData);
      return Promise.resolve({ data: { data: {} } });
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取待借出列表失败');
    });
  });

  it('handles borrowed request returning null', async () => {
    request.get.mockImplementation((url, config) => {
      if (url === '/borrows/pending') return Promise.resolve(pendingData);
      if (url === '/borrows') return Promise.resolve(null);
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');
    fireEvent.click(screen.getByRole('tab', { name: /待归还/ }));

    await waitFor(() => {
      expect(screen.queryByText('Book B')).not.toBeInTheDocument();
    });
  });

  it('switches tab via tabs bar', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');

    fireEvent.click(screen.getByRole('tab', { name: /待归还/ }));

    await waitFor(() => {
      expect(screen.getByText('Book B')).toBeInTheDocument();
    });
  });

  it('warns when return id is empty on return tab', async () => {
    const warningSpy = vi.spyOn(message, 'warning').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowLendReturn />
      </MemoryRouter>
    );

    await screen.findByText('待借出');
    fireEvent.click(screen.getByRole('tab', { name: /待归还/ }));

    const input = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(input, { target: { value: '   ' } });

    fireEvent.click(screen.getByText('归还登记'));

    await waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith('请输入有效的借阅单号，如 BR000001');
    });
  });
});
