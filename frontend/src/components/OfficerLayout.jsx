import React, { useState, useContext } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Dropdown } from 'antd';
import { 
  AppstoreOutlined, 
  SettingOutlined, 
  WalletOutlined, 
  BankOutlined, 
  UserOutlined,
  HistoryOutlined,
  FileDoneOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  WalletFilled,
  DashboardOutlined,
  DollarOutlined,
  SwapOutlined,
  ShopOutlined,
  TeamOutlined,
  AuditOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function OfficerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const isLoginPage = location.pathname === '/officer/login';

  const menuItems = [
    { key: '/officer/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/officer/services', icon: <AppstoreOutlined />, label: 'Dịch vụ' },
    { key: '/officer/pockets', icon: <WalletOutlined />, label: 'Quản lý ví' },
    { key: '/officer/billers', icon: <ShopOutlined />, label: 'Nhà cung cấp' },
    { key: '/officer/banks', icon: <BankOutlined />, label: 'Ngân hàng' },
    { key: '/officer/customers', icon: <TeamOutlined />, label: 'Khách hàng' },
    { key: '/officer/pocket-entries', icon: <SwapOutlined />, label: 'Biến động ví' },
    { key: '/officer/trail', icon: <AuditOutlined />, label: 'Tra soát giao dịch' },
    { key: '/officer/history', icon: <FileDoneOutlined />, label: 'Lịch sử giao dịch' },
  ];

  const userMenu = {
    items: [
      { key: '1', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: () => { logout(); navigate('/officer/login'); } }
    ]
  };

  if (!user && !isLoginPage) {
    return <Navigate to="/officer/login" replace />;
  }

  if (isLoginPage) {
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
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => navigate('/officer/services')}>
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
            {menuItems.find(item => item.key === location.pathname)?.label || (location.pathname === '/officer/transaction-design' ? 'Cấu hình giao dịch' : 'Tổng quan')}
          </Title>
          <Space size="large">
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9' }} icon={<UserOutlined />} />
                <Text strong style={{ color: '#0f172a', fontSize: 14 }}>{user?.name || user?.username || 'Vận hành viên'}</Text>
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
