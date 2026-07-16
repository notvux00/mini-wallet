/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useEffect, useState, useContext } from 'react';
import socketIOClient from 'socket.io-client';
import sailsIOClient from 'sails.io.js';
import { AuthContext } from './AuthContext';
import { message } from 'antd';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [ioClient, setIoClient] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const token = localStorage.getItem('MINI_WALLET_TOKEN');
    if (user && token) {
      console.log('Khởi tạo kết nối Socket (sails.io.js)...');
      let io;
      if (socketIOClient.sails) {
        io = socketIOClient;
      } else {
        io = sailsIOClient(socketIOClient);
      }
      
      io.sails.url = 'http://localhost:1337';
      io.sails.environment = 'production'; // Tắt cảnh báo dev
      io.sails.autoConnect = false; // Tự connect để kiểm soát
      io.sails.headers = {
        Authorization: `Bearer ${token}`
      };

      const socket = io.sails.connect();

      socket.on('connect', () => {
        console.log('Đã kết nối Socket thành công! ID:', socket.id);
        
        // Gọi API subscribe qua socket ảo của Sails
        const subscribeUrl = user.role === 'officer' 
          ? '/api/officer/socket/subscribe' 
          : '/api/customer/socket/subscribe';
          
        socket.get(subscribeUrl, (resData, jwres) => {
          if (jwres.statusCode === 200) {
            console.log('Đăng ký nhận thông báo realtime thành công!', resData);
          } else {
            console.error('Lỗi đăng ký realtime:', jwres);
          }
        });
      });

      socket.on('connect_error', (err) => {
        console.error('Lỗi kết nối Socket:', err);
      });

      // Tạo wrapper để component dùng chung interface với code cũ
      const fakeIo = {
        socket: socket
      };

      setIoClient(fakeIo);

      return () => {
        try {
          if (socket && typeof socket.disconnect === 'function') {
             socket.removeAllListeners();
             socket.disconnect();
          }
        } catch (e) {
          // Bỏ qua lỗi already disconnected
        }
      };
    } else {
      setIoClient(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ io: ioClient }}>
      {children}
    </SocketContext.Provider>
  );
};
