import React, { useContext } from 'react';
import { Typography, Card, Avatar, Button, Row, Col, Statistic } from 'antd';
import { UserOutlined, WalletOutlined, LogoutOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);

  // Nếu chưa đăng nhập, đá về trang Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="dashboard-container">
      <Row justify="center">
        <Col xs={24} sm={20} md={16} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size="large" icon={<UserOutlined />} style={{ background: '#1e3c72' }} />
                <Title level={4} style={{ margin: 0 }}>Xin chào, {user.name || user.username}!</Title>
              </div>
            }
            extra={<Button type="text" danger icon={<LogoutOutlined />} onClick={logout}>Đăng xuất</Button>}
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card type="inner" style={{ background: '#f8f9fa' }}>
                  <Statistic 
                    title="Số điện thoại" 
                    value={user.phone || 'N/A'} 
                    prefix={<UserOutlined />} 
                    valueStyle={{ fontSize: 18 }} 
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" style={{ background: '#f8f9fa' }}>
                  <Statistic 
                    title="Phân quyền" 
                    value={user.role === 'customer' ? 'Khách hàng' : 'Quản trị viên'} 
                    prefix={<WalletOutlined />} 
                    valueStyle={{ fontSize: 18, color: user.role === 'officer' ? '#cf1322' : '#3f8600' }} 
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Text type="secondary">Các tính năng ví sẽ được cập nhật trong Phase 2...</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
