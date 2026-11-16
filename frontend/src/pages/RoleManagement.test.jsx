import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleManagement from './RoleManagement';
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

let mockRole = 'admin';
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

describe('RoleManagement', () => {
  const rolesData = {
    data: {
      data: {
        items: [
          { id: 1, name: 'admin', description: '管理员', permissions: ['user:manage', 'role:manage'] },
          { id: 2, name: 'librarian', description: '图书管理员', permissions: ['book:read', 'book:write'] },
          { id: 3, name: 'custom', description: '自定义角色', permissions: ['book:read'] },
        ],
        pagination: { total: 30 },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'admin';
    request.get.mockResolvedValue(rolesData);
  });

  it('renders role list with search', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(screen.getByText('librarian')).toBeInTheDocument();
    expect(screen.getByText('新增角色')).toBeInTheDocument();
  });

  it('supports keyword search', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('角色名称');
    fireEvent.change(searchInput, { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith(
        '/roles',
        expect.objectContaining({
          params: expect.objectContaining({ keyword: 'admin' }),
        })
      );
    });
  });

  it('supports pagination change', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    const nextPageButton = document.querySelector('.ant-pagination-next button');
    if (nextPageButton) {
      fireEvent.click(nextPageButton);
      await waitFor(() => {
        expect(request.get).toHaveBeenCalledWith(
          '/roles',
          expect.objectContaining({
            params: expect.objectContaining({ page: 2 }),
          })
        );
      });
    }
  });

  it('opens add modal and submits new role with permissions', async () => {
    request.post.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    fireEvent.click(screen.getByRole('button', { name: /新增角色/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入角色名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入角色名称'), { target: { value: 'manager' } });
    fireEvent.change(screen.getByPlaceholderText('请输入角色描述'), { target: { value: '部门经理' } });

    const checkbox = screen.getByLabelText('用户管理');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith(
        '/roles',
        expect.objectContaining({
          name: 'manager',
          description: '部门经理',
          permissions: expect.arrayContaining(['user:manage']),
        })
      );
      expect(successSpy).toHaveBeenCalledWith('角色新增成功');
    });
  });

  it('opens edit modal and submits updated role', async () => {
    request.put.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    const editButtons = screen.getAllByRole('button', { name: /编辑/ });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入角色名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入角色描述'), { target: { value: '超级管理员' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.put).toHaveBeenCalledWith(
        '/roles/1',
        expect.objectContaining({ description: '超级管理员' })
      );
      expect(successSpy).toHaveBeenCalledWith('角色更新成功');
    });
  });

  it('deletes custom role after confirmation', async () => {
    request.delete.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('custom');

    const rows = screen.getAllByRole('row');
    const customRow = rows.find((row) => row.textContent.includes('custom'));
    const deleteButton = customRow.querySelector('button[class*="ant-btn-dangerous"]') || customRow.querySelector('button');

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('确定删除角色 "custom" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(request.delete).toHaveBeenCalledWith('/roles/3');
      expect(successSpy).toHaveBeenCalledWith('删除成功');
    });
  });

  it('prevents deleting system preset role', async () => {
    const warningSpy = vi.spyOn(message, 'warning').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    const rows = screen.getAllByRole('row');
    const adminRow = rows.find((row) => row.textContent.includes('admin'));
    const deleteButton = adminRow.querySelector('button[class*="ant-btn-dangerous"]') || adminRow.querySelector('button');

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith('系统预设角色不允许删除');
    });
  });

  it('prevents deleting role with is_system flag', async () => {
    const warningSpy = vi.spyOn(message, 'warning').mockImplementation(() => {});
    request.get.mockResolvedValue({
      data: {
        data: {
          items: [{ id: 5, name: 'system-role', description: '系统角色', is_system: true, permissions: [] }],
          pagination: { total: 1 },
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('system-role');

    const rows = screen.getAllByRole('row');
    const systemRow = rows.find((row) => row.textContent.includes('system-role'));
    const deleteButton = systemRow.querySelector('button[class*="ant-btn-dangerous"]') || systemRow.querySelector('button');

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith('系统预设角色不允许删除');
    });
  });

  it('shows associated users when clicking view users', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/roles') return Promise.resolve(rolesData);
      if (url === '/roles/1/users') {
        return Promise.resolve({
          data: {
            data: {
              items: [
                { id: 1, username: 'alice', department: '技术部' },
                { id: 2, username: 'bob', department: '运营部' },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    const viewButtons = screen.getAllByRole('button', { name: /查看用户/ });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });
  });

  it('shows empty state when role has no associated users', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/roles') return Promise.resolve(rolesData);
      if (url.startsWith('/roles/')) return Promise.resolve({ data: { data: { items: [] } } });
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    const viewButtons = screen.getAllByRole('button', { name: /查看用户/ });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('暂无关联用户')).toBeInTheDocument();
    });
  });

  it('shows error when fetch roles fails', async () => {
    request.get.mockRejectedValue({ response: { data: { message: '角色加载失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('角色加载失败');
    });
  });

  it('shows error when submit role fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '提交角色失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    fireEvent.click(screen.getByRole('button', { name: /新增角色/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入角色名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入角色名称'), { target: { value: 'fail' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('提交角色失败');
    });
  });

  it('shows error when delete role fails', async () => {
    request.delete.mockRejectedValue({ response: { data: { message: '删除角色失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('custom');

    const rows = screen.getAllByRole('row');
    const customRow = rows.find((row) => row.textContent.includes('custom'));
    const deleteButton = customRow.querySelector('button[class*="ant-btn-dangerous"]') || customRow.querySelector('button');

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('确定删除角色 "custom" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('删除角色失败');
    });
  });

  it('shows error when fetch role users fails', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/roles') return Promise.resolve(rolesData);
      if (url.startsWith('/roles/')) return Promise.reject({ response: { data: { message: '获取用户失败' } } });
      return Promise.resolve({ data: { data: {} } });
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    const viewButtons = screen.getAllByRole('button', { name: /查看用户/ });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('获取用户失败');
    });
  });

  it('hides management buttons for non-admin role', async () => {
    mockRole = 'librarian';

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    expect(screen.queryByText('新增角色')).not.toBeInTheDocument();
    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
  });

  it('cancels role modal', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText('admin');

    fireEvent.click(screen.getByRole('button', { name: /新增角色/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入角色名称')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /取\s*消|Cancel/ })[0]);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('请输入角色名称')).not.toBeInTheDocument();
    });
  });
});
