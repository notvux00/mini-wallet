/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useState, useEffect, useCallback } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('MINI_WALLET_TOKEN'),
    role: localStorage.getItem('MINI_WALLET_ROLE')
  }));

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['authMe', auth.role, auth.token],
    queryFn: () => authService.getMe(auth.role),
    enabled: !!auth.token,
    retry: false,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('MINI_WALLET_TOKEN');
    localStorage.removeItem('MINI_WALLET_ROLE');
    queryClient.removeQueries({ queryKey: ['authMe'] });
    setAuth({ token: null, role: null });
  }, [queryClient]);

  useEffect(() => {
    // Nếu token hết hạn hoặc fetch lỗi thì tự động logout
    if (isError) {
      logout();
    }
  }, [isError, logout]);

  const login = (userData, token) => {
    localStorage.setItem('MINI_WALLET_TOKEN', token);
    localStorage.setItem('MINI_WALLET_ROLE', userData.role);
    
    // Set cache ngay lập tức để không phải chờ load lại
    queryClient.setQueryData(['authMe', userData.role, token], userData);
    
    setAuth({ token, role: userData.role });
  };

  // Trạng thái loading toàn cục: Đang có token nhưng chưa load xong data
  const loading = !!auth.token && isLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
