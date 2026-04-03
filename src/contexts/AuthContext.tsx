import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../lib/api/client';

interface RoleSummary {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  roles: RoleSummary[];
  permissions: string[];
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('skynet_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      apiClient.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('skynet_token', data.accessToken);
    localStorage.setItem('skynet_refresh_token', data.refreshToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('skynet_token');
    localStorage.removeItem('skynet_refresh_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const hasPermission = useCallback(
    (key: string): boolean => {
      if (!user) return false;
      // super_admin bypasses all permission checks
      if (user.roles.some(r => r.slug === 'super_admin')) return true;
      return user.permissions.includes(key);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (keys: string[]): boolean => keys.some(k => hasPermission(k)),
    [hasPermission],
  );

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
