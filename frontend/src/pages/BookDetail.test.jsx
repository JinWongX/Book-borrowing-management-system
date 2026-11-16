import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BookDetail from './BookDetail';
import request from '../services/request';
import { message } from 'antd';

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  const dayjs = (await import('dayjs')).default;
  return {
    ...actual,
    DatePicker: ({ onChange, placeholder, value, ...props }) => (
      <input
        {...props}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange && onChange(dayjs(e.target.value))}
        data-testid="mock-datepicker"
      />
    ),
  };
});

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: 'employee', user: { username: 'employee' } }),
}));

describe('BookDetail', () => {
  const book = {
    id: 1,
    title: 'Test Book',
    isbn: '123456',
    author: 'Author',
    publisher: 'Publisher',
    category: { name: 'Tech' },
    stock: 3,
    location: 'A-1',
    cover_url: 'http://example.com/cover.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request.get.mockResolvedValue({ data: { data: book } });
  });

  const renderDetail = () => {
    return render(
      <MemoryRouter initialEntries={['/books/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/books/:id" element={<BookDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders book details', async () => {
    renderDetail();

    expect(await screen.findByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('3 本')).toBeInTheDocument();
  });

  it('shows out of stock state', async () => {
    request.get.mockResolvedValue({ data: { data: { ...book, stock: 0 } } });

    renderDetail();

    expect(await screen.findByText('缺货')).toBeInTheDocument();
    expect(screen.getByText('暂无库存')).toBeInTheDocument();
  });

  it('submits borrow application', async () => {
    request.post.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    renderDetail();

    await screen.findByRole('button', { name: /申\s*请\s*借\s*阅/ });
    fireEvent.click(screen.getByRole('button', { name: /申\s*请\s*借\s*阅/ }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-datepicker')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('mock-datepicker'), { target: { value: '2026-08-10' } });

    fireEvent.click(screen.getAllByRole('button', { name: /确\s*定|OK/ })[0]);

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith(
        '/borrows',
        expect.objectContaining({
          book_id: 1,
          expected_return_date: '2026-08-10',
        })
      );
      expect(successSpy).toHaveBeenCalledWith('借阅申请已提交，请等待审核');
    });
  });

  it('shows placeholder when no cover url', async () => {
    request.get.mockResolvedValue({ data: { data: { ...book, cover_url: null } } });

    renderDetail();

    expect(await screen.findByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('closes borrow modal on cancel', async () => {
    renderDetail();

    await screen.findByRole('button', { name: /申\s*请\s*借\s*阅/ });
    fireEvent.click(screen.getByRole('button', { name: /申\s*请\s*借\s*阅/ }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-datepicker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /取\s*消|Cancel/ })[0]);

    await waitFor(() => {
      expect(screen.queryByTestId('mock-datepicker')).not.toBeInTheDocument();
    });
  });

  it('navigates back to book list', async () => {
    renderDetail();

    await screen.findByText('返回列表');
    fireEvent.click(screen.getByText('返回列表'));
  });

  it('shows error message when fetch book fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '图书不存在' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    renderDetail();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('图书不存在');
    });
  });

  it('shows error message when fetch book fails without server message', async () => {
    request.get.mockRejectedValue(new Error('network error'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    renderDetail();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取图书详情失败');
    });
  });

  it('shows not-exist placeholder when book is null', async () => {
    request.get.mockResolvedValue({ data: { data: null } });

    renderDetail();

    expect(await screen.findByText('图书不存在')).toBeInTheDocument();
  });

  it('shows borrow button for employee and disables when stock is 0', async () => {
    request.get.mockResolvedValue({ data: { data: { ...book, stock: 0 } } });

    renderDetail();

    expect(await screen.findByText('暂无库存')).toBeInTheDocument();
  });

  it('shows error when borrow application fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '申请失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    renderDetail();

    await screen.findByRole('button', { name: /申\s*请\s*借\s*阅/ });
    fireEvent.click(screen.getByRole('button', { name: /申\s*请\s*借\s*阅/ }));

    await waitFor(() => {
      expect(screen.getByTestId('mock-datepicker')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('mock-datepicker'), { target: { value: '2026-08-10' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确\s*定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('申请失败');
    });
  });

});
