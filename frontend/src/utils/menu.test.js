import { describe, it, expect } from 'vitest';
import { ROLES, getMenuByRole, MENU_ITEMS } from './menu';

describe('getMenuByRole', () => {
  it('returns common menus for employee', () => {
    const menus = getMenuByRole(ROLES.EMPLOYEE);
    expect(menus.length).toBeGreaterThan(0);
    expect(menus.some((item) => item.key === '/books')).toBe(true);
    expect(menus.some((item) => item.key === '/my-borrowings')).toBe(true);
    expect(menus.some((item) => item.key === '/book-management')).toBe(false);
  });

  it('returns management menus for librarian', () => {
    const menus = getMenuByRole(ROLES.LIBRARIAN);
    expect(menus.some((item) => item.key === '/book-management')).toBe(true);
    expect(menus.some((item) => item.key === '/borrow-review')).toBe(true);
    expect(menus.some((item) => item.key === '/my-borrowings')).toBe(false);
  });

  it('returns all menus for admin', () => {
    const menus = getMenuByRole(ROLES.ADMIN);
    expect(menus.some((item) => item.key === '/users')).toBe(true);
    expect(menus.some((item) => item.key === '/roles')).toBe(true);
    expect(menus.some((item) => item.key === '/statistics')).toBe(true);
  });

  it('returns empty array for invalid role', () => {
    expect(getMenuByRole(null)).toEqual([]);
    expect(getMenuByRole('')).toEqual([]);
  });
});

describe('MENU_ITEMS', () => {
  it('has unique keys', () => {
    const keys = MENU_ITEMS.map((item) => item.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});
