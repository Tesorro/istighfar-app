import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { api, refreshSession, setAccessToken } from '@/lib/api';
import type { AuthSession, User } from '@/types/api';

type Credentials = {
  email: string;
  password: string;
};

type RegisterInput = Credentials & {
  name: string;
};

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (input: Credentials) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: Dispatch<SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((next) => {
        if (active) {
          setUser(next);
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      setUser,
      async login(input) {
        const session = await api<AuthSession>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        setAccessToken(session.accessToken);
        setUser(session.user);
        return session.user;
      },
      async register(input) {
        const session = await api<AuthSession>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        setAccessToken(session.accessToken);
        setUser(session.user);
        return session.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' });
        setAccessToken(null);
        setUser(null);
      },
    }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth используется вне AuthProvider');
  }
  return context;
}
