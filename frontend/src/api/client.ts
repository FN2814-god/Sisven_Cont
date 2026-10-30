import axios from 'axios';

export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sisven_token');
  const tenantId = localStorage.getItem('sisven_tenant');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('sisven_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export function apiError(e: unknown): string {
  const anyErr = e as any;
  const msg = anyErr?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  return msg || anyErr?.message || 'Error inesperado';
}
