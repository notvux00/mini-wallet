import React, { useState } from 'react';
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
  WalletFilled
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/services', icon: <AppstoreOutlined />, label: 'Services' },
    { key: '/transaction-design', icon: <SettingOutlined />, label: 'Config Builder' },
    { key: '/pockets', icon: <WalletOutlined />, label: 'Pockets' },
    { key: '/billers', icon: <BankOutlined />, label: 'Billers' },
    { key: '/customers', icon: <UserSwitchOutlined />, label: 'Customers' },
    { key: '/trail', icon: <HistoryOutlined />, label: 'Transaction Trail' },
    { key: '/history', icon: <FileDoneOutlined />, label: 'History' },
  ];

  const userMenu = {
    items: [
      { key: '1', icon: <LogoutOutlined />, label: 'Logout' }
    ]
  };

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
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: collapsed ? 0 : 12 }}>
            <WalletFilled style={{ color: '#0ea5e9', fontSize: 28 }} />
          </div>
          {!collapsed && (
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              Mini<span style={{ color: '#0ea5e9' }}>Pocket</span>
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
                <Avatar style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9' }} icon={<UserOutlined />} />
                <Text strong style={{ color: '#0f172a', fontSize: 14 }}>Admin Officer</Text>
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
