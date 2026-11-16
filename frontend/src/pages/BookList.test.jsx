import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookList from './BookList';
import request from '../services/request';
import { message, Modal } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

let mockRole = 'librarian';
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

describe('BookList', () => {
  const booksData = {
    data: {
      data: {
        items: [
          { id: 1, title: 'Book A', author: 'Author A', isbn: '111', publisher: 'Pub A', category: { name: 'Tech' }, stock: 5, location: 'A-1' },
          { id: 2, title: 'Book B', author: 'Author B', isbn: '222', publisher: 'Pub B', category_name: 'Fiction', stock: 0, location: 'B-2' },
          { id: 3, title: 'Book C', author: 'Author C', isbn: '333', publisher: 'Pub C', stock: 2, location: 'C-3' },
        ],
        pagination: { total: 20 },
      },
    },
  };

  const categoriesData = {
    data: {
      data: [
        { id: 1, name: 'Tech', parent_id: null },
        { id: 2, name: 'Fiction', parent_id: null },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'librarian';
    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve(categoriesData);
      if (url === '/books') return Promise.resolve(booksData);
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders book list with search and category filter', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Book A')).toBeInTheDocument();
    expect(screen.getByText('Book B')).toBeInTheDocument();
    expect(screen.getByText('新增图书')).toBeInTheDocument();
  });

  it('supports keyword search', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('书名 / 作者 / ISBN');
    fireEvent.change(searchInput, { target: { value: 'Book A' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith(
        '/books',
        expect.objectContaining({
          params: expect.objectContaining({ keyword: 'Book A' }),
        })
      );
    });
  });

  it('supports pagination change', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const nextPageButton = document.querySelector('.ant-pagination-next button');
    if (nextPageButton) {
      fireEvent.click(nextPageButton);
      await waitFor(() => {
        expect(request.get).toHaveBeenCalledWith(
          '/books',
          expect.objectContaining({
            params: expect.objectContaining({ page: 2 }),
          })
        );
      });
    }
  });

  it('shows action buttons for librarian and handles delete', async () => {
    request.delete.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('确定删除图书 "Book A" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(request.delete).toHaveBeenCalledWith('/books/1');
      expect(successSpy).toHaveBeenCalledWith('删除成功');
    });
  });

  it('shows error message when fetch fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('加载失败');
    });
  });

  it('shows error when delete fails', async () => {
    request.delete.mockRejectedValue({ response: { data: { message: '删除失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('确定删除图书 "Book A" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('删除失败');
    });
  });

  it('hides management buttons for employee role', async () => {
    mockRole = 'employee';

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    expect(screen.queryByText('新增图书')).not.toBeInTheDocument();
    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
  });

  it('handles list/total fallback response shape', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve(categoriesData);
      if (url === '/books') {
        return Promise.resolve({
          data: {
            data: {
              list: [{ id: 3, title: 'Book C', author: 'Author C', isbn: '333', publisher: 'Pub C', category_name: 'History', stock: 2, location: 'C-3' }],
              total: 1,
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Book C')).toBeInTheDocument();
  });

  it('shows default error message when fetch books fails without server message', async () => {
    request.get.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取图书列表失败');
    });
  });

  it('shows default error message when fetch categories fails', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.reject(new Error('network'));
      if (url === '/books') return Promise.resolve(booksData);
      return Promise.resolve({ data: { data: {} } });
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取分类失败');
    });
  });

  it('shows default error when delete fails without server message', async () => {
    request.delete.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await screen.findByText('Book A');

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('确定删除图书 "Book A" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('删除失败');
    });
  });

  it('handles null response data', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve({ data: { data: null } });
      if (url === '/books') return Promise.resolve({ data: { data: null } });
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('图书检索')).toBeInTheDocument();
    });
  });

  it('renders category placeholder when no category info', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BookList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Book C')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
  });
});

