import axios from 'axios';

const TOKEN_KEY = 'token';

/**
 * 基础校验 localStorage 中的 JWT：
 * - 必须存在且为字符串
 * - 必须包含 header.payload.signature 三段
 * - 若 payload 中包含 exp，则校验是否过期
 *
 * 注意：当前使用 localStorage 存储 Token 是为了开发/演示便利，
 * 生产环境必须启用 HTTPS，并优先考虑 httpOnly Cookie + CSRF Token，
 * 以降低 Token 被 XSS 窃取与中间人截获的风险。
 */
export const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
};

const request = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (isTokenValid(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default request;
