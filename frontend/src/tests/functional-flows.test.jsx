import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import request from '../services/request';
import { message } from 'antd';

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  const dayjs = (await import('dayjs')).default;
  return {
    ...actual,
    DatePicker: ({ onChange, placeholder, value, disabledDate, ...props }) => (
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => <>{children}</>,
  };
});

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api' },
  },
  isTokenValid: vi.fn((token) => Boolean(token && typeof token === 'string')),
}));

const createToken = (role) => {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: '1', role, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${header}.${payload}.signature`;
};

const USERS = {
  employee: { id: 1, username: 'employee1', role: { name: 'employee' } },
  librarian: { id: 2, username: 'librarian1', role: { name: 'librarian' } },
  admin: { id: 3, username: 'admin1', role: { name: 'admin' } },
};

const USERNAME_TO_ROLE = {
  employee1: 'employee',
  librarian1: 'librarian',
  admin1: 'admin',
};

const ROLE_TEXT = {
  employee: '员工',
  librarian: '图书管理员',
  admin: '系统管理员',
};

const createBaseData = () => ({
  books: [
    {
      id: 1,
      title: 'JavaScript 高级程序设计',
      author: 'Nicholas C. Zakas',
      isbn: '9787115275790',
      publisher: '人民邮电出版社',
      category_id: 1,
      stock: 5,
      location: 'A-1-1',
      cover_url: '',
      category_name: '计算机技术',
    },
    {
      id: 2,
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      publisher: 'Prentice Hall',
      category_id: 2,
      stock: 3,
      location: 'A-1-2',
      cover_url: '',
      category_name: '编程语言',
    },
  ],
  categories: [
    { id: 1, name: '计算机技术', parent_id: null },
    { id: 2, name: '编程语言', parent_id: 1 },
    { id: 3, name: '管理学', parent_id: null },
  ],
  borrows: [
    {
      id: 1,
      book_id: 2,
      user_id: 1,
      status: 'pending',
      expected_return_date: '2026-08-20T00:00:00',
      created_at: '2026-08-01T10:00:00',
      reject_reason: null,
      actual_return_date: null,
      book: { id: 2, title: 'Clean Code', isbn: '9780132350884' },
      user: { id: 1, username: 'employee1' },
    },
  ],
  notifications: [
    {
      id: 1,
      user_id: 1,
      message: '您的借阅申请已通过审核',
      is_read: false,
      created_at: '2026-08-01T10:00:00',
    },
    {
      id: 2,
      user_id: 1,
      message: '您借阅的图书即将到期',
      is_read: false,
      created_at: '2026-08-04T10:00:00',
    },
  ],
  statistics: {
    books: [{ id: 1, name: 'JavaScript 高级程序设计', borrow_count: 10 }],
    categories: [{ id: 1, name: '计算机技术', borrow_count: 25 }],
    departments: [{ id: 1, name: '研发部', borrow_count: 30 }],
    users: [{ id: 1, name: 'employee1', borrow_count: 5 }],
    top20: [{ id: 1, name: 'JavaScript 高级程序设计', borrow_count: 10 }],
  },
});

describe('Functional flows', () => {
  let testData;
  let currentUser;
  let successSpy;
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    testData = createBaseData();
    currentUser = null;
    successSpy = vi.spyOn(message, 'success').mockImplementation(() => {});
    errorSpy = vi.spyOn(message, 'error').mockImplementation(() => {});

    request.get.mockImplementation((url, config) => {
      const params = config?.params || {};

      if (url === '/auth/me') {
        return Promise.resolve({ data: { data: currentUser } });
      }

      if (url === '/categories') {
        return Promise.resolve({ data: { data: testData.categories } });
      }

      if (url === '/books') {
        let result = [...testData.books];
        if (params.keyword) {
          result = result.filter(
            (b) =>
              b.title.includes(params.keyword) ||
              b.author.includes(params.keyword) ||
              b.isbn.includes(params.keyword)
          );
        }
        if (params.category_id) {
          result = result.filter((b) => b.category_id === params.category_id);
        }
        const page = params.page || 1;
        const pageSize = params.page_size || 10;
        const total = result.length;
        result = result.slice((page - 1) * pageSize, page * pageSize);
        return Promise.resolve({ data: { data: { items: result, pagination: { total } } } });
      }

      const bookMatch = url.match(/^\/books\/(\d+)$/);
      if (bookMatch) {
        const id = Number(bookMatch[1]);
        const book = testData.books.find((b) => b.id === id);
        if (book) {
          const category = testData.categories.find((c) => c.id === book.category_id);
          return Promise.resolve({
            data: { data: { ...book, category: category ? { id: category.id, name: category.name } : null } },
          });
        }
        return Promise.reject({ response: { data: { message: '图书不存在' } } });
      }

      if (url === '/borrows/my') {
        const list = testData.borrows.filter((b) => b.user_id === currentUser?.id);
        return Promise.resolve({ data: { data: { items: list, pagination: { total: list.length } } } });
      }

      if (url === '/borrows/pending') {
        const list = testData.borrows.filter((b) => b.status === 'pending');
        return Promise.resolve({ data: { data: { items: list, pagination: { total: list.length } } } });
      }

      if (url === '/borrows') {
        let list = [...testData.borrows];
        if (params.status) {
          const statuses = Array.isArray(params.status) ? params.status : [params.status];
          list = list.filter((b) => statuses.includes(b.status));
        }
        return Promise.resolve({ data: { data: { items: list, pagination: { total: list.length } } } });
      }

      if (url === '/notifications') {
        return Promise.resolve({ data: { data: testData.notifications } });
      }

      if (url === '/statistics/books') {
        return Promise.resolve({
          data: { data: { items: testData.statistics.books, total: testData.statistics.books.length } },
        });
      }
      if (url === '/statistics/categories') {
        return Promise.resolve({
          data: { data: { items: testData.statistics.categories, total: testData.statistics.categories.length } },
        });
      }
      if (url === '/statistics/departments') {
        return Promise.resolve({
          data: { data: { items: testData.statistics.departments, total: testData.statistics.departments.length } },
        });
      }
      if (url === '/statistics/users') {
        return Promise.resolve({
          data: { data: { items: testData.statistics.users, total: testData.statistics.users.length } },
        });
      }
      if (url === '/statistics/top20') {
        return Promise.resolve({
          data: { data: { items: testData.statistics.top20, total: testData.statistics.top20.length } },
        });
      }
      if (url === '/statistics/export') {
        return Promise.resolve({ data: 'mock-excel-content' });
      }

      return Promise.resolve({ data: { data: {} } });
    });

    request.post.mockImplementation((url, data) => {
      if (url === '/auth/login') {
        const username = data.get('username');
        const role = USERNAME_TO_ROLE[username] || 'employee';
        currentUser = USERS[role];
        const token = createToken(currentUser.role.name);
        return Promise.resolve({ data: { data: { access_token: token } } });
      }

      if (url === '/borrows') {
        const book = testData.books.find((b) => b.id === data.book_id);
        const newBorrow = {
          id: testData.borrows.length + 1,
          book_id: data.book_id,
          user_id: currentUser.id,
          status: 'pending',
          expected_return_date: `${data.expected_return_date}T00:00:00`,
          created_at: new Date().toISOString(),
          reject_reason: null,
          actual_return_date: null,
          book: book ? { id: book.id, title: book.title, isbn: book.isbn } : null,
          user: currentUser,
        };
        testData.borrows.push(newBorrow);
        return Promise.resolve({ data: { data: newBorrow } });
      }

      const approveMatch = url.match(/^\/borrows\/(\d+)\/approve$/);
      if (approveMatch) {
        const id = Number(approveMatch[1]);
        const borrow = testData.borrows.find((b) => b.id === id);
        if (borrow) {
          borrow.status = 'approved';
          return Promise.resolve({ data: { data: borrow } });
        }
        return Promise.reject({ response: { data: { message: '借阅记录不存在' } } });
      }

      const rejectMatch = url.match(/^\/borrows\/(\d+)\/reject$/);
      if (rejectMatch) {
        const id = Number(rejectMatch[1]);
        const borrow = testData.borrows.find((b) => b.id === id);
        if (borrow) {
          borrow.status = 'rejected';
          borrow.reject_reason = data.reject_reason;
          return Promise.resolve({ data: { data: borrow } });
        }
        return Promise.reject({ response: { data: { message: '借阅记录不存在' } } });
      }

      const lendMatch = url.match(/^\/borrows\/(\d+)\/lend$/);
      if (lendMatch) {
        const id = Number(lendMatch[1]);
        const borrow = testData.borrows.find((b) => b.id === id);
        if (borrow) {
          borrow.status = 'borrowed';
          return Promise.resolve({ data: { data: borrow } });
        }
        return Promise.reject({ response: { data: { message: '借阅记录不存在' } } });
      }

      const returnMatch = url.match(/^\/borrows\/(\d+)\/return$/);
      if (returnMatch) {
        const id = Number(returnMatch[1]);
        const borrow = testData.borrows.find((b) => b.id === id);
        if (borrow) {
          borrow.status = 'returned';
          borrow.actual_return_date = new Date().toISOString();
          return Promise.resolve({ data: { data: borrow } });
        }
        return Promise.reject({ response: { data: { message: '借阅记录不存在' } } });
      }

      const readMatch = url.match(/^\/notifications\/(\d+)\/read$/);
      if (readMatch) {
        const id = Number(readMatch[1]);
        const n = testData.notifications.find((item) => item.id === id);
        if (n) {
          n.is_read = true;
          return Promise.resolve({ data: { data: n } });
        }
        return Promise.reject({ response: { data: { message: '消息不存在' } } });
      }

      if (url === '/categories') {
        const newCategory = {
          id: Date.now(),
          name: data.name,
          parent_id: data.parent_id || null,
        };
        testData.categories.push(newCategory);
        return Promise.resolve({ data: { data: newCategory } });
      }

      if (url === '/books') {
        const newBook = {
          id: Date.now(),
          ...data,
          category_name: testData.categories.find((c) => c.id === data.category_id)?.name || '-',
        };
        testData.books.push(newBook);
        return Promise.resolve({ data: { data: newBook } });
      }

      return Promise.resolve({ data: { data: {} } });
    });

    request.put.mockImplementation((url, data) => {
      const categoryMatch = url.match(/^\/categories\/(\d+)$/);
      if (categoryMatch) {
        const id = Number(categoryMatch[1]);
        const category = testData.categories.find((c) => c.id === id);
        if (category) {
          Object.assign(category, data);
          return Promise.resolve({ data: { data: category } });
        }
        return Promise.reject({ response: { data: { message: '分类不存在' } } });
      }

      const bookMatch = url.match(/^\/books\/(\d+)$/);
      if (bookMatch) {
        const id = Number(bookMatch[1]);
        const book = testData.books.find((b) => b.id === id);
        if (book) {
          Object.assign(book, data);
          book.category_name = testData.categories.find((c) => c.id === data.category_id)?.name || '-';
          return Promise.resolve({ data: { data: book } });
        }
        return Promise.reject({ response: { data: { message: '图书不存在' } } });
      }

      return Promise.resolve({ data: { data: {} } });
    });

    request.delete.mockImplementation((url) => {
      const categoryMatch = url.match(/^\/categories\/(\d+)$/);
      if (categoryMatch) {
        const id = Number(categoryMatch[1]);
        testData.categories = testData.categories.filter((c) => c.id !== id);
        return Promise.resolve({ data: { data: {} } });
      }

      const bookMatch = url.match(/^\/books\/(\d+)$/);
      if (bookMatch) {
        const id = Number(bookMatch[1]);
        testData.books = testData.books.filter((b) => b.id !== id);
        return Promise.resolve({ data: { data: {} } });
      }

      return Promise.resolve({ data: { data: {} } });
    });
  });

  const renderApp = (initialEntries = ['/login']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>
    );
  };

  const loginAs = async (role) => {
    const user = USERS[role];
    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: user.username } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));
    await waitFor(() => {
      expect(screen.getByText(`您好，${user.username}`)).toBeInTheDocument();
    });
    expect(screen.getByText(`(${ROLE_TEXT[role]})`)).toBeInTheDocument();
  };

  const clickMenu = (label) => {
    fireEvent.click(screen.getByText(label));
  };

  const clickConfirmOk = () => {
    const confirmBtns = document.querySelector('.ant-modal-confirm-btns');
    const okButton = confirmBtns?.querySelector('button:last-child');
    if (okButton) {
      fireEvent.click(okButton);
    }
  };

  it('流程 1：员工登录 → 图书检索 → 查看图书详情 → 提交借阅申请 → 查看我的借阅', async () => {
    renderApp();

    await loginAs('employee');

    clickMenu('图书检索');
    await waitFor(() => {
      expect(screen.getByText('JavaScript 高级程序设计')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByText('详情');
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('图书详情')).toBeInTheDocument();
    });
    expect(screen.getByText('JavaScript 高级程序设计')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '申请借阅' }));
    await waitFor(() => {
      expect(screen.getByText('预计归还日期')).toBeInTheDocument();
    });

    const dateInput = screen.getByTestId('mock-datepicker');
    fireEvent.change(dateInput, { target: { value: '2026-08-15' } });

    fireEvent.click(screen.getAllByRole('button', { name: /OK|确\s*定/ })[0]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('借阅申请已提交，请等待审核');
    });

    clickMenu('我的借阅');
    await waitFor(() => {
      expect(screen.getByText('BR000001')).toBeInTheDocument();
    });
  });

  it('流程 2：图书管理员登录 → 借阅审核 → 通过申请 → 借出登记 → 归还登记', async () => {
    renderApp();

    await loginAs('librarian');

    clickMenu('借阅审核');
    await waitFor(() => {
      expect(screen.getByText('BR000001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('通过'));
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('审核通过');
    });

    fireEvent.click(screen.getByText('已审核'));
    await waitFor(() => {
      expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
    });

    clickMenu('借还登记');
    await waitFor(() => {
      expect(screen.getByText('借阅单号 / 图书信息')).toBeInTheDocument();
    });

    const borrowInput = screen.getByPlaceholderText('扫描或输入借阅单号，如 BR000001');
    fireEvent.change(borrowInput, { target: { value: 'BR000001' } });
    fireEvent.click(screen.getByRole('button', { name: /^借\s*出\s*登\s*记$/ }));
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('借出登记成功');
    });

    fireEvent.click(screen.getByText('待归还'));
    await waitFor(() => {
      expect(screen.getByText('BR000001')).toBeInTheDocument();
    });

    fireEvent.change(borrowInput, { target: { value: 'BR000001' } });
    fireEvent.click(screen.getByRole('button', { name: /^归\s*还\s*登\s*记$/ }));
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('归还登记成功');
    });

    await waitFor(() => {
      expect(screen.queryByText('BR000001')).not.toBeInTheDocument();
    });
  });

  it('流程 3：图书管理员登录 → 拒绝借阅申请（填写理由）', async () => {
    renderApp();

    await loginAs('librarian');

    clickMenu('借阅审核');
    await waitFor(() => {
      expect(screen.getByText('BR000001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('拒绝'));
    await waitFor(() => {
      expect(screen.getByText('填写拒绝理由')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入拒绝理由'), {
      target: { value: '库存不足，暂无法借阅' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /OK|确\s*定/ })[0]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('已拒绝');
    });

    fireEvent.click(screen.getByText('已审核'));
    await waitFor(() => {
      expect(screen.getAllByText('已拒绝').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('库存不足，暂无法借阅')).toBeInTheDocument();
  });

  it('流程 4：员工登录 → 查看消息中心 → 标记消息已读', async () => {
    renderApp();

    await loginAs('employee');

    clickMenu('消息中心');
    await waitFor(() => {
      expect(screen.getByText('您的借阅申请已通过审核')).toBeInTheDocument();
    });

    const readButtons = screen.getAllByText('标记已读');
    expect(readButtons.length).toBe(2);

    fireEvent.click(readButtons[0]);
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('已标记为已读');
    });

    await waitFor(() => {
      expect(screen.getAllByText('标记已读').length).toBe(1);
    });
  });

  it('流程 5：图书管理员登录 → 图书分类管理 → 新增/编辑/删除分类', async () => {
    renderApp();

    await loginAs('librarian');

    clickMenu('分类管理');
    await waitFor(() => {
      expect(screen.getByText('图书分类管理')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('计算机技术')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增分类' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入分类名称'), { target: { value: '新分类' } });
    fireEvent.click(screen.getAllByRole('button', { name: /OK|确\s*定/ })[0]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('分类新增成功');
    });
    await waitFor(() => {
      expect(screen.getByText('新分类')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('编辑');
    const newCategoryEdit = editButtons[editButtons.length - 1];
    fireEvent.click(newCategoryEdit);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入分类名称')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('请输入分类名称');
    fireEvent.change(nameInput, { target: { value: '更新分类' } });
    fireEvent.click(screen.getAllByRole('button', { name: /OK|确\s*定/ })[0]);

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('分类更新成功');
    });
    await waitFor(() => {
      expect(screen.getByText('更新分类')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('删除');
    const newCategoryDelete = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(newCategoryDelete);

    await waitFor(() => {
      expect(screen.getByText('确认删除分类', { selector: '.ant-modal-confirm-title' })).toBeInTheDocument();
    });

    clickConfirmOk();
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('删除成功');
    });
    expect(screen.queryByText('更新分类')).not.toBeInTheDocument();
  });

  it('流程 6：图书管理员登录 → 图书管理 → 新增图书 → 编辑图书 → 删除图书', async () => {
    renderApp();

    await loginAs('librarian');

    clickMenu('图书管理');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '新增图书' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新增图书' }));
    await waitFor(() => {
      expect(screen.getByText('新增图书')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('请输入书名'), { target: { value: '测试图书' } });
    fireEvent.change(screen.getByPlaceholderText('请输入作者'), { target: { value: '测试作者' } });
    fireEvent.change(screen.getByPlaceholderText('请输入ISBN'), { target: { value: '9780000000000' } });
    fireEvent.change(screen.getByPlaceholderText('请输入出版社'), { target: { value: '测试出版社' } });
    fireEvent.change(screen.getByPlaceholderText('请输入库存数量'), { target: { value: 10 } });
    fireEvent.change(screen.getByPlaceholderText('请输入上架位置'), { target: { value: 'Z-1-1' } });

    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('图书新增成功');
    });
    await waitFor(() => {
      expect(screen.getByText('测试图书')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('编辑');
    const newBookEdit = editButtons[editButtons.length - 1];
    fireEvent.click(newBookEdit);

    await waitFor(() => {
      expect(screen.getByText('编辑图书')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue('测试图书')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('请输入书名');
    fireEvent.change(titleInput, { target: { value: '测试图书-已更新' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('图书更新成功');
    });
    await waitFor(() => {
      expect(screen.getByText('测试图书-已更新')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('删除');
    const newBookDelete = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(newBookDelete);

    await waitFor(() => {
      expect(screen.getByText('确认删除图书', { selector: '.ant-modal-confirm-title' })).toBeInTheDocument();
    });

    clickConfirmOk();
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('删除成功');
    });
    expect(screen.queryByText('测试图书-已更新')).not.toBeInTheDocument();
  });

  it('流程 7：系统管理员登录 → 统计报表 → 导出 Excel', async () => {
    renderApp();

    await loginAs('admin');

    clickMenu('统计报表');
    await waitFor(() => {
      expect(screen.getByText('按图书统计')).toBeInTheDocument();
    });

    const excelButtons = screen.getAllByText('导出 Excel');
    fireEvent.click(excelButtons[0]);

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
});
