import React, { createContext, useEffect, useState, useContext } from 'react';
import { io as socketIOClient } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { message } from 'antd';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [ioClient, setIoClient] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const token = localStorage.getItem('MINI_WALLET_TOKEN');
    console.log('SocketContext useEffect ran', { user, token });
    if (user && token) {
      console.log('Khởi tạo kết nối Socket (RAW)...');
      // Dùng raw socket.io-client để kết nối
      const socket = socketIOClient('http://localhost:1337', {
        transports: ['websocket'],
        // Truyền token qua extraHeaders nếu server cần kiểm tra, nhưng với blast thì ai cũng nhận được
        extraHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      socket.on('connect', () => {
        console.log('Đã kết nối Socket thành công! ID:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.error('Lỗi kết nối Socket:', err);
        message.error('Lỗi kết nối Realtime: ' + err.message);
      });

      // Tạo một object giả lập cấu trúc io.socket để không phải sửa code các component
      const fakeIo = {
        socket: {
          on: (event, cb) => socket.on(event, cb),
          off: (event, cb) => socket.off(event, cb)
        }
      };

      setIoClient(fakeIo);

      return () => {
        socket.disconnect();
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
