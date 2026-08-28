import axios from 'axios';

// Always same-origin: /api is proxied to the API server (vite.config.ts locally,
// vercel.json in prod). Keeps the auth cookie first-party — never point this cross-origin.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// On an expired/rejected session, bounce to login — but ignore the /auth/me probe,
// which legitimately 401s for logged-out visitors on public pages.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/me') && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
