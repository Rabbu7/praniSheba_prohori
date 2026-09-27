import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMe, loginUser, registerUser } from '../services/api';

const TOKEN_KEY = 'prohori_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    getMe()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch((error) => {
        if (!cancelled && error.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const authenticate = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => authenticate(await loginUser({ email, password }));
  const register = async (username, email, password) => authenticate(
    await registerUser({ username, email, password }),
  );

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
