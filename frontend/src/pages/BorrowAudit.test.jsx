import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BorrowAudit from './BorrowAudit';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('BorrowAudit', () => {
  const pendingData = {
    data: {
      data: {
        items: [
          { id: 1, status: 'pending', user: { username: 'user1' }, book: { title: 'Book A', isbn: '111' }, expected_return_date: '2026-08-10T00:00:00', created_at: '2026-08-01T00:00:00' },
        ],
        total: 1,
      },
    },
  };

  const auditedData = {
    data: {
      data: {
        items: [
          { id: 2, status: 'approved', user_name: 'user2', book_title: 'Book B', book_isbn: '222', expected_return_date: '2026-08-09T00:00:00', created_at: '2026-08-01T00:00:00' },
        ],
        total: 1,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockImplementation((url, config) => {
      if (url === '/borrows/pending') return Promise.resolve(pendingData);
      if (url === '/borrows') return Promise.resolve(auditedData);
      return Promise.resolve({ data: { data: {} } });
    });
    request.post.mockResolvedValue({ data: { data: {} } });
  });

  it('renders pending and audited tabs', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    expect(await screen.findByText('待审核')).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('BR000001'))).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('approves a pending borrow', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('通过');
    fireEvent.click(screen.getByText('通过'));

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith('/borrows/1/approve');
      expect(successSpy).toHaveBeenCalledWith('审核通过');
    });
  });

  it('rejects a pending borrow with reason', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('拒绝');
    fireEvent.click(screen.getAllByText('拒绝')[0]);

    await waitFor(() => {
      expect(screen.getByText('填写拒绝理由')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入拒绝理由'), { target: { value: '库存不足' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith('/borrows/1/reject', { reject_reason: '库存不足' });
      expect(successSpy).toHaveBeenCalledWith('已拒绝');
    });
  });

  it('shows error when approve fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '审核失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('通过');
    fireEvent.click(screen.getByText('通过'));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('审核失败');
    });
  });

  it('shows error when reject fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '拒绝失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('拒绝');
    fireEvent.click(screen.getAllByText('拒绝')[0]);

    await waitFor(() => {
      expect(screen.getByText('填写拒绝理由')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入拒绝理由'), { target: { value: '库存不足' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('拒绝失败');
    });
  });

  it('shows error when fetch fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('加载失败');
    });
  });

  it('shows default error message when fetch fails without server message', async () => {
    request.get.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取审核列表失败');
    });
  });

  it('renders fallback fields and unknown status', async () => {
    request.get.mockImplementation((url, config) => {
      if (url === '/borrows/pending') {
        return Promise.resolve({
          data: {
            data: [
              { id: 3, status: 'unknown', user_name: 'fallback_user', book_title: 'fallback_book', book_isbn: '999', expected_return_date: null, created_at: null, reject_reason: null },
            ],
          },
        });
      }
      if (url === '/borrows') return Promise.resolve(auditedData);
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    expect(await screen.findByText('fallback_user')).toBeInTheDocument();
    expect(screen.getByText('fallback_book')).toBeInTheDocument();
    expect(screen.getByText('unknown')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders all fallback placeholders and handles audited array response', async () => {
    request.get.mockImplementation((url, config) => {
      if (url === '/borrows/pending') {
        return Promise.resolve({
          data: {
            data: {
              items: [
                { id: 4, status: 'pending', expected_return_date: null, created_at: null, reject_reason: null },
              ],
            },
          },
        });
      }
      if (url === '/borrows') {
        return Promise.resolve({
          data: {
            data: [
              { id: 5, status: 'approved', expected_return_date: '2026-08-09T00:00:00', created_at: '2026-08-01T00:00:00', reject_reason: 'reason' },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    expect(await screen.findByText('BR000004')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: /已审核/ }));

    await waitFor(() => {
      expect(screen.getByText('BR000005')).toBeInTheDocument();
    });
  });

  it('switches to audited tab', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('通过');

    fireEvent.click(screen.getByRole('tab', { name: /已审核/ }));

    await waitFor(() => {
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('cancels reject modal', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('拒绝');
    fireEvent.click(screen.getAllByText('拒绝')[0]);

    await waitFor(() => {
      expect(screen.getByText('填写拒绝理由')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /取\s*消|Cancel/ })[0]);

    await waitFor(() => {
      expect(screen.queryByText('填写拒绝理由')).not.toBeInTheDocument();
    });
  });

  it('shows default error when approve fails without server message', async () => {
    request.post.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('通过');
    fireEvent.click(screen.getByText('通过'));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('操作失败');
    });
  });

  it('shows default error when reject fails without server message', async () => {
    request.post.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BorrowAudit />
      </MemoryRouter>
    );

    await screen.findByText('拒绝');
    fireEvent.click(screen.getAllByText('拒绝')[0]);

    await waitFor(() => {
      expect(screen.getByText('填写拒绝理由')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入拒绝理由'), { target: { value: '库存不足' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确\s*定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('操作失败');
    });
  });
});

