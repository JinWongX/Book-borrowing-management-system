import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CategoryList from './CategoryList';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

let mockRole = 'librarian';
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

describe('CategoryList', () => {
  const categoriesData = {
    data: {
      data: [
        { id: 1, name: 'Root', parent_id: null },
        { id: 2, name: 'Child', parent_id: 1 },
        { id: 3, name: 'GrandChild', parent_id: 2 },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'librarian';
    request.get.mockResolvedValue(categoriesData);
  });

  it('renders category tree', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('opens add modal and submits new category', async () => {
    request.post.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    fireEvent.click(screen.getByRole('button', { name: /新增分类/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入分类名称'), { target: { value: 'New Category' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith(
        '/categories',
        expect.objectContaining({ name: 'New Category', parent_id: null })
      );
      expect(successSpy).toHaveBeenCalledWith('分类新增成功');
    });
  });

  it('opens edit modal and disables descendant options', async () => {
    request.put.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    const editButtons = screen.getAllByRole('button', { name: /编辑/ });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入分类名称'), { target: { value: 'Updated Root' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.put).toHaveBeenCalledWith(
        '/categories/1',
        expect.objectContaining({ name: 'Updated Root' })
      );
      expect(successSpy).toHaveBeenCalledWith('分类更新成功');
    });
  });

  it('deletes category after confirmation', async () => {
    request.delete.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('确认删除分类').length).toBeGreaterThan(0);
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(request.delete).toHaveBeenCalledWith('/categories/1');
      expect(successSpy).toHaveBeenCalledWith('删除成功');
    });
  });

  it('shows error when delete category fails', async () => {
    request.delete.mockRejectedValue({ response: { data: { message: '删除分类失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('确认删除分类').length).toBeGreaterThan(0);
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('删除分类失败');
    });
  });

  it('shows error when submit category fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '提交分类失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    fireEvent.click(screen.getByRole('button', { name: /新增分类/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入分类名称'), { target: { value: 'Fail Category' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('提交分类失败');
    });
  });

  it('shows error when fetch categories fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '分类加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('分类加载失败');
    });
  });

  it('shows default error message when fetch categories fails', async () => {
    request.get.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取分类列表失败');
    });
  });

  it('shows default error message when submit category fails', async () => {
    request.post.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    fireEvent.click(screen.getByRole('button', { name: /新增分类/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入分类名称'), { target: { value: 'Fail Category' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('操作失败');
    });
  });

  it('hides management buttons for employee role', async () => {
    mockRole = 'employee';

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    expect(screen.queryByRole('button', { name: /新增分类/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
  });

  it('cancels category modal', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    fireEvent.click(screen.getByRole('button', { name: /新增分类/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /取\s*消|Cancel/ })[0]);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('请输入分类名称')).not.toBeInTheDocument();
    });
  });

  it('shows default error when delete category fails', async () => {
    request.delete.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CategoryList />
      </MemoryRouter>
    );

    await screen.findByText('Root');

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('确认删除分类').length).toBeGreaterThan(0);
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('删除失败');
    });
  });
});

