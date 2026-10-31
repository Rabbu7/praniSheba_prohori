import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMe, loginUser, registerUser } from '../services/api';
import { disconnectSocket } from '../services/socket';

const TOKEN_KEY = 'prohori_token';
const SELECTED_DEVICE_KEY = 'prohori_selected_device';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SELECTED_DEVICE_KEY);
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

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
          logout();
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

  const register = async (firstName, lastName, email, password, division, district) => authenticate(
    await registerUser({ firstName, lastName, email, password, division, district }),
  );

  const refreshUser = async () => {
    try {
      const nextUser = await getMe();
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        setUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
