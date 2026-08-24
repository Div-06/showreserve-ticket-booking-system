import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, Role } from '../types';
import api from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: Role) => Promise<User>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api
        .get('/auth/me')
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          // Token invalid
          logout();
        });
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    const { user: userData, accessToken, refreshToken } = res.data;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const register = async (name: string, email: string, password: string, role?: Role): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password, role });
    const { user: userData, accessToken, refreshToken } = res.data;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    if (token) {
      api.post('/auth/logout').catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
