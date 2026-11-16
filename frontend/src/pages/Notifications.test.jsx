import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Notifications from './Notifications';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

describe('Notifications', () => {
  const notificationsData = {
    data: {
      data: {
        items: [
          { id: 1, message: '您的借阅申请已通过', is_read: false, created_at: '2026-08-05T09:00:00' },
          { id: 2, message: '您的借阅申请被拒绝', is_read: true, created_at: '2026-08-04T09:00:00' },
        ],
        total: 2,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockResolvedValue(notificationsData);
    request.post.mockResolvedValue({ data: { data: {} } });
  });

  it('renders notification list with unread badge', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    expect(await screen.findByText('您的借阅申请已通过')).toBeInTheDocument();
    expect(screen.getByText('您的借阅申请被拒绝')).toBeInTheDocument();
    expect(screen.getByText('全部已读')).toBeInTheDocument();
  });

  it('marks single notification as read', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('您的借阅申请已通过');

    const readButtons = screen.getAllByText('标记已读');
    fireEvent.click(readButtons[0]);

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith('/notifications/1/read');
      expect(successSpy).toHaveBeenCalledWith('已标记为已读');
    });
  });

  it('marks all unread notifications as read', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('您的借阅申请已通过');

    fireEvent.click(screen.getByText('全部已读'));

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith('/notifications/1/read');
      expect(successSpy).toHaveBeenCalledWith('全部已读');
    });
  });

  it('disables mark all read when no unread notifications', async () => {
    request.get.mockResolvedValue({
      data: { data: { items: [{ id: 2, message: '已读消息', is_read: true, created_at: '2026-08-04T09:00:00' }] } },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('已读消息');

    const button = screen.getByRole('button', { name: '全部已读' });
    expect(button).toBeDisabled();
  });

  it('shows error when mark read fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '标记失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('您的借阅申请已通过');

    const readButtons = screen.getAllByText('标记已读');
    fireEvent.click(readButtons[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('标记失败');
    });
  });

  it('shows error when mark all read fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '全部标记失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('您的借阅申请已通过');

    fireEvent.click(screen.getByRole('button', { name: '全部已读' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('全部标记失败');
    });
  });

  it('shows error when fetch fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
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
        <Notifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取消息失败');
    });
  });

  it('handles array response and null created_at', async () => {
    request.get.mockResolvedValue({
      data: {
        data: [
          { id: 3, message: 'Array message', is_read: false, created_at: null },
        ],
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    expect(await screen.findByText('Array message')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('does nothing when mark all read with no unread notifications', async () => {
    request.get.mockResolvedValue({
      data: { data: { items: [{ id: 2, message: '已读消息', is_read: true, created_at: '2026-08-04T09:00:00' }] } },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('已读消息');

    fireEvent.click(screen.getByRole('button', { name: '全部已读' }));

    await waitFor(() => {
      expect(request.post).not.toHaveBeenCalled();
    });
  });

  it('shows default error when mark all read fails', async () => {
    request.post.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('您的借阅申请已通过');

    fireEvent.click(screen.getByRole('button', { name: '全部已读' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('标记全部已读失败');
    });
  });

  it('shows default error when mark read fails', async () => {
    request.post.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await screen.findByText('您的借阅申请已通过');

    const readButtons = screen.getAllByText('标记已读');
    fireEvent.click(readButtons[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('标记已读失败');
    });
  });

  it('handles empty object response', async () => {
    request.get.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Notifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('消息中心')).toBeInTheDocument();
    });
  });
});

