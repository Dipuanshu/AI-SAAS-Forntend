import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, configureApi, get, post, refreshSession, setTokens } from './api';
import { getItem, removeItem, setItem } from './storage';
import type { Company, Role, Session, Subscription, User } from './types';

const KEY_ACCESS = 'auth.access';
const KEY_REFRESH = 'auth.refresh';

interface AuthState {
  status: 'loading' | 'out' | 'in';
  user: User | null;
  company: Company | null;
  subscription: Subscription | null;
  notice: string | null;
}

interface RegisterInput {
  companyName: string;
  companyPhone?: string;
  adminName: string;
  email: string;
  password: string;
  planCode?: string;
}

interface AuthApi extends AuthState {
  role: Role | null;
  isSuperAdmin: boolean;
  loginCompany: (companySlug: string, email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  registerCompany: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  clearNotice: () => void;
}

const Ctx = createContext<AuthApi | null>(null);

const OUT: AuthState = { status: 'out', user: null, company: null, subscription: null, notice: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...OUT, status: 'loading' });

  const persist = useCallback((access: string | null, refresh: string | null) => {
    if (access && refresh) {
      void setItem(KEY_ACCESS, access);
      void setItem(KEY_REFRESH, refresh);
    } else {
      void removeItem(KEY_ACCESS);
      void removeItem(KEY_REFRESH);
    }
  }, []);

  const applySession = useCallback(
    (s: Session) => {
      setTokens(s.accessToken, s.refreshToken);
      persist(s.accessToken, s.refreshToken);
      setState({ status: 'in', user: s.user, company: s.company, subscription: s.subscription, notice: null });
    },
    [persist],
  );

  const dropSession = useCallback(
    (notice: string | null) => {
      setTokens(null, null);
      persist(null, null);
      setState({ ...OUT, notice });
    },
    [persist],
  );

  // Wire the API client to this provider and restore a saved session once.
  useEffect(() => {
    configureApi({ onTokens: persist, onSessionLost: (m) => dropSession(m) });
    (async () => {
      const [access, refresh] = await Promise.all([getItem(KEY_ACCESS), getItem(KEY_REFRESH)]);
      if (!refresh) return setState(OUT);
      setTokens(access, refresh);
      try {
        if (!access && !(await refreshSession())) return setState(OUT);
        const me = await get<Pick<Session, 'user' | 'company' | 'subscription'>>('/api/auth/me');
        setState({ status: 'in', user: me.user, company: me.company, subscription: me.subscription, notice: null });
      } catch (e: any) {
        // Network failure on boot should not log the user out of a valid session.
        if (e?.code === 'NETWORK') return setState({ ...OUT, notice: e.message });
        dropSession(null);
      }
    })();
  }, [persist, dropSession]);

  const value = useMemo<AuthApi>(
    () => ({
      ...state,
      role: state.user?.role ?? null,
      isSuperAdmin: state.user?.role === 'super_admin',
      loginCompany: async (companySlug, email, password) =>
        applySession(await post<Session>('/api/auth/login', { companySlug, email, password }, { auth: false })),
      loginAdmin: async (email, password) =>
        applySession(await post<Session>('/api/auth/admin/login', { email, password }, { auth: false })),
      registerCompany: async (input) => applySession(await post<Session>('/api/auth/register-company', input, { auth: false })),
      logout: async () => {
        try {
          const refresh = await getItem(KEY_REFRESH);
          if (refresh) await api('POST', '/api/auth/logout', { refreshToken: refresh }, { auth: false });
        } catch {
          /* best effort */
        }
        dropSession(null);
      },
      reload: async () => {
        const me = await get<Pick<Session, 'user' | 'company' | 'subscription'>>('/api/auth/me');
        setState((s) => ({ ...s, user: me.user, company: me.company, subscription: me.subscription }));
      },
      clearNotice: () => setState((s) => ({ ...s, notice: null })),
    }),
    [state, applySession, dropSession],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
