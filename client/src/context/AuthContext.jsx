import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import api, { setUnauthorizedHandler } from '../api/axios';

const TOKEN_KEY = 'access_token';

const AuthContext = createContext(null);

function userFromToken(token) {
  const decoded = jwtDecode(token);
  if (decoded.exp * 1000 < Date.now()) return null;

  return {
    id: decoded.id,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
  };
}

function getInitialToken() {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;

  try {
    return userFromToken(stored) ? stored : null;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getInitialToken());
  const isLoading = false;
  const user = token ? userFromToken(token) : null;

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      window.location.href = '/login';
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
