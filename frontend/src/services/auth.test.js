import { describe, it, expect, vi } from 'vitest';
import request from './request';
import { login, getCurrentUser } from './auth';

vi.mock('./request', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('auth services', () => {
  it('login sends form-urlencoded request', async () => {
    const mockResponse = { data: { data: { access_token: 'test-token' } } };
    request.post.mockResolvedValue(mockResponse);

    const result = await login('admin', 'password123');

    expect(request.post).toHaveBeenCalledWith(
      '/auth/login',
      expect.any(URLSearchParams),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const params = request.post.mock.calls[0][1];
    expect(params.get('username')).toBe('admin');
    expect(params.get('password')).toBe('password123');
    expect(result).toBe(mockResponse);
  });

  it('getCurrentUser calls /auth/me', async () => {
    const mockResponse = { data: { data: { id: 1, username: 'admin' } } };
    request.get.mockResolvedValue(mockResponse);

    const result = await getCurrentUser();

    expect(request.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toBe(mockResponse);
  });
});
