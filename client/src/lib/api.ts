import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useServerWake } from '../store/serverWakeStore';

// Always same-origin: /api is proxied to the API server (vite.config.ts locally,
// vercel.json in prod). Keeps the auth cookie first-party — never point this cross-origin.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20_000,
});

// --- Render free-tier cold start ------------------------------------------------------
// After 15 min idle the API spins down; the next request then hangs or fails with a
// gateway error for ~30-60s while the container boots, then works. We surface a "waking
// up" banner once a request runs cold-start-long, and keep retrying gateway failures
// within a bounded window so the user's action still lands.
const REVEAL_AFTER_MS = 4_000;
const RETRY_DELAY_MS = 5_000;
const RETRY_WINDOW_MS = 70_000;

let inFlight = 0;
let revealTimer: ReturnType<typeof setTimeout> | undefined;

function markRequestStart(): void {
  inFlight += 1;
  if (!revealTimer) {
    revealTimer = setTimeout(() => useServerWake.getState().setWaking(true), REVEAL_AFTER_MS);
  }
}

function markRequestEnd(): void {
  inFlight = Math.max(0, inFlight - 1);
  if (inFlight === 0) {
    clearTimeout(revealTimer);
    revealTimer = undefined;
    useServerWake.getState().setWaking(false);
  }
}

type RetryConfig = InternalAxiosRequestConfig & { retryStart?: number };

function isColdStartError(err: AxiosError): boolean {
  if (!err.response) return err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
  return [502, 503, 504].includes(err.response.status);
}

api.interceptors.request.use((config: RetryConfig) => {
  // Retries re-enter here; only the first attempt is counted toward the in-flight tally.
  if (config.retryStart === undefined) markRequestStart();
  return config;
});

api.interceptors.response.use(
  (response) => {
    markRequestEnd();
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    if (config && isColdStartError(error)) {
      if (config.retryStart === undefined) config.retryStart = Date.now();
      if (Date.now() - config.retryStart < RETRY_WINDOW_MS) {
        // ponytail: retries non-GET too — during a cold start the request never reached a
        // live server, so a duplicate write isn't a real risk in this window.
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return api(config);
      }
    }

    markRequestEnd();

    // On an expired/rejected session, bounce to login — but ignore the /auth/me probe,
    // which legitimately 401s for logged-out visitors on public pages.
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/me') && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
