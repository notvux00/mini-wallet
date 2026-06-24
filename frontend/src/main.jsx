import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)
