import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request, { isTokenValid } from './request';

const TOKEN_KEY = 'token';

describe('isTokenValid', () => {
  it('returns false for non-string or missing token', () => {
    expect(isTokenValid(null)).toBe(false);
    expect(isTokenValid(undefined)).toBe(false);
    expect(isTokenValid(123)).toBe(false);
  });

  it('returns false for malformed JWT', () => {
    expect(isTokenValid('not-a-jwt')).toBe(false);
    expect(isTokenValid('header.payload')).toBe(false);
  });

  it('returns false for expired token', () => {
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(isTokenValid(`header.${expiredPayload}.signature`)).toBe(false);
  });

  it('returns true for valid token without exp', () => {
    const payload = btoa(JSON.stringify({ sub: '1' }));
    expect(isTokenValid(`header.${payload}.signature`)).toBe(true);
  });

  it('returns true for token with future exp', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(isTokenValid(`header.${payload}.signature`)).toBe(true);
  });

  it('returns false when payload is not valid base64 or JSON', () => {
    expect(isTokenValid('header.not-valid-base64.signature')).toBe(false);
    expect(isTokenValid(`header.${btoa('not-json')}.signature`)).toBe(false);
  });
});

describe('request interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('injects Authorization header when token is valid', () => {
    const token = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
    localStorage.setItem(TOKEN_KEY, token);

    const fulfilled = request.interceptors.request.handlers[0].fulfilled;
    const config = { headers: {} };
    const result = fulfilled(config);

    expect(result.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('does not inject Authorization header when token is invalid', () => {
    localStorage.setItem(TOKEN_KEY, 'invalid-token');

    const fulfilled = request.interceptors.request.handlers[0].fulfilled;
    const config = { headers: {} };
    const result = fulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('removes token and redirects to login on 401 response', async () => {
    const token = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
    localStorage.setItem(TOKEN_KEY, token);

    const setHref = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
    vi.spyOn(window.location, 'href', 'set').mockImplementation(setHref);

    const rejected = request.interceptors.response.handlers[0].rejected;
    const error = { response: { status: 401 } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(setHref).toHaveBeenCalledWith('/login');
  });

  it('rejects non-401 errors without redirect', async () => {
    const rejected = request.interceptors.response.handlers[0].rejected;
    const error = { response: { status: 500 } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(window.location.href).not.toBe('/login');
  });
});
