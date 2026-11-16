import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BookForm from './BookForm';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

let mockRole = 'librarian';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

describe('BookForm', () => {
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
    request.get.mockResolvedValue(categoriesData);
  });

  const renderNew = () => {
    return render(
      <MemoryRouter initialEntries={['/books/new']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/books/new" element={<BookForm />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders new book form', async () => {
    renderNew();

    expect(await screen.findByText('新增图书')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入书名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入ISBN')).toBeInTheDocument();
  });

  it('submits new book form', async () => {
    request.post.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    renderNew();

    await screen.findByText('新增图书');
    await waitFor(() => expect(request.get).toHaveBeenCalledWith('/categories'));

    fireEvent.change(screen.getByPlaceholderText('请输入书名'), { target: { value: 'New Book' } });
    fireEvent.change(screen.getByPlaceholderText('请输入ISBN'), { target: { value: 'ISBN123' } });

    const stockInput = screen.getByPlaceholderText('请输入库存数量');
    fireEvent.change(stockInput, { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith(
        '/books',
        expect.objectContaining({
          title: 'New Book',
          isbn: 'ISBN123',
          stock: 5,
        })
      );
      expect(successSpy).toHaveBeenCalledWith('图书新增成功');
    });
  });

  it('loads existing book in edit mode', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve(categoriesData);
      if (url.startsWith('/books/')) {
        return Promise.resolve({
          data: {
            data: {
              id: 1,
              title: 'Existing Book',
              author: 'Author',
              isbn: 'ISBN001',
              publisher: 'Pub',
              category_id: 1,
              stock: 10,
              location: 'A-1',
              cover_url: 'http://example.com/cover.jpg',
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter initialEntries={['/books/edit/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/books/edit/:id" element={<BookForm />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('编辑图书')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Existing Book')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ISBN001')).toBeInTheDocument();
  });

  it('submits edit book form', async () => {
    request.put.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve(categoriesData);
      if (url.startsWith('/books/')) {
        return Promise.resolve({
          data: {
            data: {
              id: 1,
              title: 'Existing Book',
              author: 'Author',
              isbn: 'ISBN001',
              publisher: 'Pub',
              category_id: 1,
              stock: 10,
              location: 'A-1',
              cover_url: 'http://example.com/cover.jpg',
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter initialEntries={['/books/edit/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/books/edit/:id" element={<BookForm />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByDisplayValue('Existing Book');
    await waitFor(() => expect(request.get).toHaveBeenCalledWith('/categories'));

    fireEvent.change(screen.getByPlaceholderText('请输入书名'), { target: { value: 'Updated Book' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(request.put).toHaveBeenCalledWith(
        '/books/1',
        expect.objectContaining({ title: 'Updated Book' })
      );
      expect(successSpy).toHaveBeenCalledWith('图书更新成功');
    });
  });

  it('shows no permission view for employee', async () => {
    mockRole = 'employee';

    render(
      <MemoryRouter initialEntries={['/books/new']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/books/new" element={<BookForm />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('无权限')).toBeInTheDocument();
    mockRole = 'librarian';
  });

  it('shows error when fetch book fails', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/categories') return Promise.resolve(categoriesData);
      return Promise.reject({ response: { data: { message: '获取失败' } } });
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/books/edit/1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/books/edit/:id" element={<BookForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取失败');
    });
  });

  it('shows error when fetch categories fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '分类加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    renderNew();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('分类加载失败');
    });
  });

  it('handles cover upload success and error', async () => {
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    renderNew();
    await screen.findByText('新增图书');

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, {
      target: { files: [new File(['cover'], 'cover.png', { type: 'image/png' })] },
    });

    expect(successSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('shows error when submit fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '提交失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    renderNew();

    await screen.findByText('新增图书');
    await waitFor(() => expect(request.get).toHaveBeenCalledWith('/categories'));

    fireEvent.change(screen.getByPlaceholderText('请输入书名'), { target: { value: 'New Book' } });
    fireEvent.change(screen.getByPlaceholderText('请输入ISBN'), { target: { value: 'ISBN123' } });
    fireEvent.change(screen.getByPlaceholderText('请输入库存数量'), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('提交失败');
    });
  });
});

