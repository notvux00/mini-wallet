import axios from 'axios';

// Tạo một instance của axios với baseURL mặc định trỏ về Sails Backend
const axiosInstance = axios.create({
  baseURL: 'http://localhost:1337',
  timeout: 10000,
});

// Request Interceptor: Tự động móc Token từ túi quần (localStorage) gắn lên Header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('MINI_WALLET_TOKEN');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Bắt lỗi toàn cục
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu bị lỗi 401 (Hết hạn Token), tự động đá về trang Login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('MINI_WALLET_TOKEN');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
