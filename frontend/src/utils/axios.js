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
  (response) => {
    // Nếu backend trả về HTTP 200 nhưng có mã lỗi (err !== 0)
    if (response.data && response.data.err !== undefined) {
      if (response.data.err !== 0 && response.data.err !== 200) {
        let errorMsg = response.data.data?.message || response.data.message || 'Lỗi từ máy chủ';
        // Loại bỏ mã lỗi nội bộ (ví dụ: "AUTH_ERR.WRONG_PIN: Mã PIN không chính xác" -> "Mã PIN không chính xác")
        if (errorMsg.includes(': ')) {
          errorMsg = errorMsg.substring(errorMsg.indexOf(': ') + 2);
        }
        const error = new Error(errorMsg);
        error.response = response;
        return Promise.reject(error);
      }
    }
    return response;
  },
  (error) => {
    // Nếu bị lỗi 401 (Hết hạn Token), tự động đá về trang Login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('MINI_WALLET_TOKEN');
      if (window.location.pathname.startsWith('/officer')) {
        window.location.href = '/officer/login';
      } else {
        window.location.href = '/app/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
