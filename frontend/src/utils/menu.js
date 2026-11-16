export const ROLES = {
  EMPLOYEE: 'employee',
  LIBRARIAN: 'librarian',
  ADMIN: 'admin',
};

export const MENU_ITEMS = [
  {
    key: '/',
    label: '首页',
    path: '/',
    roles: [ROLES.EMPLOYEE, ROLES.LIBRARIAN, ROLES.ADMIN],
  },
  {
    key: '/books',
    label: '图书检索',
    path: '/books',
    roles: [ROLES.EMPLOYEE, ROLES.LIBRARIAN, ROLES.ADMIN],
  },
  {
    key: '/my-borrowings',
    label: '我的借阅',
    path: '/my-borrowings',
    roles: [ROLES.EMPLOYEE],
  },
  {
    key: '/notifications',
    label: '消息中心',
    path: '/notifications',
    roles: [ROLES.EMPLOYEE, ROLES.LIBRARIAN, ROLES.ADMIN],
  },
  {
    key: '/book-management',
    label: '图书管理',
    path: '/book-management',
    roles: [ROLES.LIBRARIAN],
  },
  {
    key: '/categories',
    label: '分类管理',
    path: '/categories',
    roles: [ROLES.LIBRARIAN, ROLES.ADMIN],
  },
  {
    key: '/borrow-review',
    label: '借阅审核',
    path: '/borrow-review',
    roles: [ROLES.LIBRARIAN],
  },
  {
    key: '/borrow-return',
    label: '借还登记',
    path: '/borrow-return',
    roles: [ROLES.LIBRARIAN],
  },
  {
    key: '/overdue',
    label: '逾期列表',
    path: '/overdue',
    roles: [ROLES.LIBRARIAN],
  },
  {
    key: '/statistics',
    label: '统计报表',
    path: '/statistics',
    roles: [ROLES.LIBRARIAN, ROLES.ADMIN],
  },
  {
    key: '/users',
    label: '用户管理',
    path: '/users',
    roles: [ROLES.ADMIN],
  },
  {
    key: '/roles',
    label: '角色权限',
    path: '/roles',
    roles: [ROLES.ADMIN],
  },
];

export const getMenuByRole = (role) => {
  if (!role) return [];
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
};
