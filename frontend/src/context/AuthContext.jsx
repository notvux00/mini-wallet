import React, { createContext, useState, useEffect } from 'react';
import axios from '../utils/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm tự động check token khi F5 (Reload)
  const fetchMe = async () => {
    const token = localStorage.getItem('MINI_WALLET_TOKEN');
    const role = localStorage.getItem('MINI_WALLET_ROLE');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Gọi API tuỳ theo Role (Tuân thủ Kiến trúc phân tách của Backend)
      const url = role === 'officer' ? '/api/officer/me' : '/api/auth/me';
      const response = await axios.post(url);
      setUser(response.data.data);
    } catch (error) {
      console.error('Lỗi Token hết hạn hoặc sai:', error);
      localStorage.removeItem('MINI_WALLET_TOKEN');
      localStorage.removeItem('MINI_WALLET_ROLE');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('MINI_WALLET_TOKEN', token);
    localStorage.setItem('MINI_WALLET_ROLE', userData.role);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('MINI_WALLET_TOKEN');
    localStorage.removeItem('MINI_WALLET_ROLE');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
