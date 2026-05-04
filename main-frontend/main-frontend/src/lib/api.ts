import axios, { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

let _getToken: (() => Promise<string | null>) | null = null;
let _interceptorId: number | null = null;

export function setAuthTokenGetter(getToken: () => Promise<string | null>) {
  _getToken = getToken;

  // Remove any previously registered interceptor
  if (_interceptorId !== null) {
    api.interceptors.request.eject(_interceptorId);
    _interceptorId = null;
  }

  _interceptorId = api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (!_getToken) return config;

      try {
        const token = await _getToken();
        console.log('[api.ts] Token obtained:', token ? '✅ yes' : '❌ null');
        if (token) {
          config.headers = config.headers ?? {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('[api.ts] Failed to get token:', e);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
}

export default api;