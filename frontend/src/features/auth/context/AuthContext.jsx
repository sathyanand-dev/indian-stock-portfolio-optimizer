import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../../../api/auth.api';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && authApi.isAuthenticated();

  useEffect(() => {
    const initializeAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch {
          authApi.removeToken();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const tokenResponse = await authApi.login({ username, password });
    authApi.setToken(tokenResponse.access_token);
    const userData = await authApi.getCurrentUser();
    setUser(userData);
  };

  const register = async (username, password, email) => {
    await authApi.register({ username, password, email });
    await login(username, password);
  };

  /** Exchanges a Google ID token for an app session. */
  const loginWithGoogle = async (credential) => {
    const res = await authApi.loginWithGoogle(credential);
    authApi.setToken(res.access_token);
    const userData = res.user ?? (await authApi.getCurrentUser());
    setUser(userData);
    return res;
  };

  const logout = () => {
    authApi.removeToken();
    setUser(null);
  };

  const refreshUser = async () => {
    const userData = await authApi.getCurrentUser();
    setUser(userData);
    return userData;
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
