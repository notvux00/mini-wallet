import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Tránh gọi lại quá nhiều lần khi switch tab
      retry: 1, // Chỉ thử lại 1 lần nếu lỗi
      staleTime: 5 * 60 * 1000, // Dữ liệu cũ sau 5 phút
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0ea5e9', // Premium Ocean Blue
            borderRadius: 6,         // Sharp, professional corners
            fontFamily: "'Inter', sans-serif",
            colorBgContainer: '#ffffff',
          },
          components: {
            Table: {
              headerBg: '#fafafa',
              rowHoverBg: '#f3f4f6',
            },
            Card: {
              colorBgContainer: '#ffffff',
            }
          }
        }}
      >
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
