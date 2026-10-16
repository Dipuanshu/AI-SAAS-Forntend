import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Session } from './types';

/**
 * On a phone, "localhost" is the phone itself. While developing, Expo tells the app which computer
 * served the bundle (hostUri, e.g. 192.168.1.5:8081), so we point "localhost" at that computer instead.
 */
export function resolveApiUrl(configured: string, hostUri?: string | null, os: string = Platform.OS): string {
  const url = configured.replace(/\/$/, '');
  if (os === 'web') return url;
  const host = hostUri?.split(':')[0] ?? '';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/.test(url);
  if (isLocal && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return url.replace(/\/\/(localhost|127\.0\.0\.1)/, `//${host}`);
  }
  return url;
}

export const API_URL = resolveApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost,
);

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface Hooks {
  onTokens: (access: string | null, refresh: string | null) => void;
  onSessionLost: (message: string) => void;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hooks: Hooks = { onTokens: () => {}, onSessionLost: () => {} };
let refreshing: Promise<boolean> | null = null;

export function configureApi(h: Hooks) {
  hooks = h;
}

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
}

export const hasRefreshToken = () => !!refreshToken;

async function send(method: string, path: string, body?: unknown, token?: string | null) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  } catch (e: any) {
    throw new ApiError(0, 'NETWORK', e?.name === 'AbortError' ? 'The server took too long to respond.' : `Cannot reach the server (${API_URL}). Check your connection.`);
  } finally {
    clearTimeout(timer);
  }
}

/** Exchanges the refresh token for a new pair. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const { res, json } = await send('POST', '/api/auth/refresh', { refreshToken });
        if (!res.ok) return false;
        const s = json as Session;
        setTokens(s.accessToken, s.refreshToken);
        hooks.onTokens(s.accessToken, s.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

const FATAL_CODES = new Set(['COMPANY_SUSPENDED', 'ACCOUNT_DISABLED', 'REFRESH_INVALID']);

export async function api<T = any>(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth !== false;
  let { res, json } = await send(method, path, body, auth ? accessToken : null);

  if (auth && res.status === 401 && (json?.error?.code === 'TOKEN_INVALID' || json?.error?.code === 'UNAUTHORIZED')) {
    if (await refreshSession()) {
      ({ res, json } = await send(method, path, body, accessToken));
    } else {
      setTokens(null, null);
      hooks.onSessionLost('Your session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const err = json?.error ?? {};
    const code: string = err.code ?? 'ERROR';
    const message: string = err.message ?? `Request failed (${res.status})`;
    if (auth && FATAL_CODES.has(code)) {
      setTokens(null, null);
      hooks.onSessionLost(message);
    }
    throw new ApiError(res.status, code, message, err.details);
  }
  return json as T;
}

export const get = <T = any>(path: string) => api<T>('GET', path);
export const post = <T = any>(path: string, body?: unknown, opts?: { auth?: boolean }) => api<T>('POST', path, body ?? {}, opts);
export const patch = <T = any>(path: string, body: unknown) => api<T>('PATCH', path, body);
export const put = <T = any>(path: string, body: unknown) => api<T>('PUT', path, body);
export const del = <T = any>(path: string, body?: unknown) => api<T>('DELETE', path, body);
