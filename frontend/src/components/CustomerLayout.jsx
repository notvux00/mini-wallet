import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Dropdown } from 'antd';
import { 
  HomeOutlined, 
  SwapOutlined, 
  FileTextOutlined, 
  UserOutlined,
  LogoutOutlined,
  WalletFilled,
  HistoryOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function CustomerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = React.useContext(AuthContext);

  const isAuthPage = location.pathname === '/app/login' || location.pathname === '/app/register';

  const menuItems = [
    { key: '/app/home', icon: <HomeOutlined />, label: 'Dashboard' },
    { key: '/app/transfer', icon: <SwapOutlined />, label: 'P2P Transfer' },
    { key: '/app/bill-payment', icon: <FileTextOutlined />, label: 'Bill Payment' },
    { key: '/app/history', icon: <HistoryOutlined />, label: 'History' },
  ];

  const userMenu = {
    items: [
      { key: '1', icon: <LogoutOutlined />, label: 'Logout', onClick: () => { logout(); navigate('/app/login'); } }
    ]
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    if (phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  };

  if (isAuthPage) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <Content>
          <Outlet />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f7f9fa' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        className="glass-sider"
        width={220}
        theme="light"
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => navigate('/app/home')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: collapsed ? 0 : 12 }}>
            <WalletFilled style={{ color: '#0ea5e9', fontSize: 28 }} />
          </div>
          {!collapsed && (
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              Mini<span style={{ color: '#0ea5e9' }}>Wallet</span>
            </Title>
          )}
        </div>
        <Menu 
          theme="light" 
          mode="inline" 
          selectedKeys={[location.pathname]} 
          items={menuItems} 
          onClick={({key}) => navigate(key)}
          style={{ background: 'transparent', padding: '16px 0', borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ background: '#f7f9fa' }}>
        <Header className="glass-header" style={{ padding: '0 32px', height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
            {menuItems.find(item => item.key === location.pathname)?.label || 'Dashboard'}
          </Title>
          <Space size="large">
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#0ea5e9' }} icon={<UserOutlined />} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                  <Text strong style={{ color: '#0f172a', fontSize: 14 }}>{user?.name || 'Customer'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{maskPhone(user?.phone)}</Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ 
          margin: '32px', 
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
