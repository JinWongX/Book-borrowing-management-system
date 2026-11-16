import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserList from './UserList';
import request from '../services/request';
import { message } from 'antd';

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
}));

let mockRole = 'admin';
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

const selectAntdOption = async (wrapper, optionText) => {
  const selector = wrapper.querySelector('.ant-select-selector') || wrapper;
  fireEvent.mouseDown(selector);
  await waitFor(() => {
    const items = document.querySelectorAll('.ant-select-dropdown .ant-select-item');
    expect(items.length).toBeGreaterThan(0);
  });
  const items = document.querySelectorAll('.ant-select-dropdown .ant-select-item');
  const target = Array.from(items).find((el) => el.textContent.trim() === optionText);
  if (target) {
    fireEvent.mouseDown(target);
    fireEvent.click(target);
  }
};

describe('UserList', () => {
  const rolesData = {
    data: {
      data: {
        items: [
          { id: 1, name: 'admin' },
          { id: 2, name: 'librarian' },
          { id: 3, name: 'employee' },
        ],
        total: 3,
      },
    },
  };

  const usersData = {
    data: {
      data: {
        items: [
          { id: 1, username: 'alice', department: '技术部', role: { id: 1, name: 'admin' }, is_active: true },
          { id: 2, username: 'bob', department: '运营部', role: { id: 2, name: 'librarian' }, is_active: false },
          { id: 3, username: 'charlie', department: '财务部', role: { id: 3, name: 'employee' }, is_active: true },
        ],
        pagination: { total: 30 },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'admin';
    request.get.mockImplementation((url) => {
      if (url === '/roles') return Promise.resolve(rolesData);
      if (url === '/users') return Promise.resolve(usersData);
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders user list with search and role filter', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('新增用户')).toBeInTheDocument();
  });

  it('supports keyword search', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('用户名 / 部门');
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          params: expect.objectContaining({ keyword: 'alice' }),
        })
      );
    });
  });

  it('supports role filter', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const filterSelect = screen.getAllByRole('combobox')[0];
    await selectAntdOption(filterSelect, 'librarian');

    await waitFor(() => {
      expect(request.get).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          params: expect.objectContaining({ role: 2 }),
        })
      );
    });
  });

  it('supports pagination change', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const nextPageButton = document.querySelector('.ant-pagination-next button');
    if (nextPageButton) {
      fireEvent.click(nextPageButton);
      await waitFor(() => {
        expect(request.get).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            params: expect.objectContaining({ page: 2 }),
          })
        );
      });
    }
  });

  it('opens add modal and submits new user', async () => {
    request.post.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    fireEvent.click(screen.getByRole('button', { name: /新增用户/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'dave' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password' } });

    const roleLabel = document.querySelector('label[for="role"]');
    const roleFormItem = roleLabel.closest('.ant-form-item');
    const roleSelect = roleFormItem.querySelector('.ant-select');
    await selectAntdOption(roleSelect, 'employee');

    fireEvent.change(screen.getByPlaceholderText('请输入部门'), { target: { value: '市场部' } });

    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.post).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          username: 'dave',
          password: 'password',
          role_id: 3,
          department: '市场部',
          is_active: true,
        })
      );
      expect(successSpy).toHaveBeenCalledWith('用户新增成功');
    });
  });

  it('opens edit modal and submits updated user', async () => {
    request.put.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const editButtons = screen.getAllByRole('button', { name: /编辑/ });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'alice-updated' } });
    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(request.put).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({ username: 'alice-updated' })
      );
      expect(successSpy).toHaveBeenCalledWith('用户更新成功');
    });
  });

  it('deletes user after confirmation', async () => {
    request.delete.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('确定删除用户 "alice" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(request.delete).toHaveBeenCalledWith('/users/1');
      expect(successSpy).toHaveBeenCalledWith('删除成功');
    });
  });

  it('toggles user status', async () => {
    request.patch.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const switches = document.querySelectorAll('.ant-switch');
    expect(switches.length).toBeGreaterThan(0);
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(request.patch).toHaveBeenCalledWith('/users/1/status', { is_active: false });
      expect(successSpy).toHaveBeenCalledWith('状态更新成功');
    });
  });

  it('batch enables selected users', async () => {
    request.patch.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const checkboxes = document.querySelectorAll('.ant-table-row .ant-checkbox-input');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('批量启用')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('批量启用'));

    await waitFor(() => {
      expect(request.patch).toHaveBeenCalledWith('/users/batch/status', {
        ids: [1],
        is_active: true,
      });
      expect(successSpy).toHaveBeenCalledWith('批量状态更新成功');
    });
  });

  it('batch disables selected users', async () => {
    request.patch.mockResolvedValue({ data: { data: {} } });
    const successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const checkboxes = document.querySelectorAll('.ant-table-row .ant-checkbox-input');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('批量禁用')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('批量禁用'));

    await waitFor(() => {
      expect(request.patch).toHaveBeenCalledWith('/users/batch/status', {
        ids: [1],
        is_active: false,
      });
      expect(successSpy).toHaveBeenCalledWith('批量状态更新成功');
    });
  });

  it('shows batch buttons only when rows are selected', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    expect(screen.queryByText('批量启用')).not.toBeInTheDocument();
    expect(screen.queryByText('批量禁用')).not.toBeInTheDocument();

    const checkboxes = document.querySelectorAll('.ant-table-row .ant-checkbox-input');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('批量启用')).toBeInTheDocument();
      expect(screen.getByText('批量禁用')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch users fails', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/roles') return Promise.resolve(rolesData);
      if (url === '/users') return Promise.reject({ response: { data: { message: '加载失败' } } });
      return Promise.resolve({ data: { data: {} } });
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('加载失败');
    });
  });

  it('shows error message when fetch roles fails', async () => {
    request.get.mockImplementation((url) => {
      if (url === '/roles') return Promise.reject({ response: { data: { message: '角色加载失败' } } });
      if (url === '/users') return Promise.resolve(usersData);
      return Promise.resolve({ data: { data: {} } });
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('角色加载失败');
    });
  });

  it('shows error when submit user fails', async () => {
    request.post.mockRejectedValue({ response: { data: { message: '提交用户失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    fireEvent.click(screen.getByRole('button', { name: /新增用户/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'fail' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password' } });

    const roleLabel = document.querySelector('label[for="role"]');
    const roleFormItem = roleLabel.closest('.ant-form-item');
    const roleSelect = roleFormItem.querySelector('.ant-select');
    await selectAntdOption(roleSelect, 'employee');

    fireEvent.click(screen.getAllByRole('button', { name: /确定|OK/ })[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('提交用户失败');
    });
  });

  it('shows error when delete user fails', async () => {
    request.delete.mockRejectedValue({ response: { data: { message: '删除用户失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('确定删除用户 "alice" 吗？')).toBeInTheDocument();
    });

    const confirmOkButton = screen.getAllByRole('button', { name: /删\s*除/ }).pop();
    fireEvent.click(confirmOkButton);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('删除用户失败');
    });
  });

  it('shows error when toggle status fails', async () => {
    request.patch.mockRejectedValue({ response: { data: { message: '状态更新失败' } } });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    const switches = document.querySelectorAll('.ant-switch');
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('状态更新失败');
    });
  });

  it('hides management buttons for non-admin role', async () => {
    mockRole = 'librarian';

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    expect(screen.queryByText('新增用户')).not.toBeInTheDocument();
    expect(screen.queryByText('编辑')).not.toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-table-row .ant-checkbox-input')).not.toBeInTheDocument();
  });

  it('cancels user modal', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UserList />
      </MemoryRouter>
    );

    await screen.findByText('alice');

    fireEvent.click(screen.getByRole('button', { name: /新增用户/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /取\s*消|Cancel/ })[0]);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('请输入用户名')).not.toBeInTheDocument();
    });
  });
});
