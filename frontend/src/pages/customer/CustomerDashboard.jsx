 
import { useContext, useEffect } from 'react';
import { Card, Typography, Row, Col, List, Avatar, Space, Divider, Skeleton, notification } from 'antd';
import { 
  SwapOutlined, 
  FileTextOutlined, 
  WalletOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  QrcodeOutlined,
  MobileOutlined,
  BankOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { useDashboard } from '../../hooks/useCustomer';
import { useQueryClient } from '@tanstack/react-query';

const { Title, Text } = Typography;

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { io } = useContext(SocketContext);
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading, isError } = useDashboard();



  if (!user) {
    return <Navigate to="/app/login" replace />;
  }

  const quickActions = [
    { icon: <SwapOutlined />, label: 'Chuyển tiền', path: '/app/transfer', color: '#0ea5e9', bg: '#e0f2fe' },
    { icon: <FileTextOutlined />, label: 'Hóa đơn', path: '/app/bill-payment', color: '#8b5cf6', bg: '#ede9fe' },
    { icon: <MobileOutlined />, label: 'Nạp ĐT', path: '/app/topup', color: '#10b981', bg: '#d1fae5' },
    { icon: <QrcodeOutlined />, label: 'Quét QR', path: '/app/coming-soon', color: '#f59e0b', bg: '#fef3c7' },
    { icon: <BankOutlined />, label: 'Ngân hàng', path: '/app/banks', color: '#ec4899', bg: '#fce7f3' },
    { icon: <HistoryOutlined />, label: 'Lịch sử', path: '/app/history', color: '#64748b', bg: '#f1f5f9' },
  ];

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: 32 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>Xin chào, {user?.name || user?.phone}!</Title>
        <Text style={{ color: '#64748b' }}>Dưới đây là tổng quan ví của bạn hôm nay.</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card 
            className="premium-gradient-card"
            style={{ 
              borderRadius: 24, 
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#fff',
              border: 'none',
              height: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ marginTop: 20 }} />
            ) : isError ? (
              <Text type="danger">Không thể tải dữ liệu ví</Text>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <WalletOutlined style={{ fontSize: 20, marginRight: 8, color: '#94a3b8' }} />
                      <Text style={{ color: '#94a3b8', fontSize: 14 }}>Số dư khả dụng</Text>
                    </div>
                    <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 800, fontSize: 36 }}>
                      {dashboardData?.balance?.toLocaleString('vi-VN')} <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 600 }}>VND</span>
                    </Title>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>M</span>
                  </div>
                </div>
                
                <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />
                
                <Row>
                  <Col span={12}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>Tiền vào tháng này</Text>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#34d399' }} />
                      <Text style={{ color: '#fff', fontWeight: 600 }}>+{(dashboardData?.income || 0).toLocaleString('vi-VN')} đ</Text>
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>Tiền ra tháng này</Text>
                    <Space>
                      <ArrowDownOutlined style={{ color: '#f87171' }} />
                      <Text style={{ color: '#fff', fontWeight: 600 }}>-{(dashboardData?.expense || 0).toLocaleString('vi-VN')} đ</Text>
                    </Space>
                  </Col>
                </Row>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card 
            title={<Title level={5} style={{ margin: 0 }}>Thao tác nhanh</Title>}
            className="glass-card" 
            style={{ borderRadius: 24, height: '100%' }}
          >
            <Row gutter={[16, 24]}>
              {quickActions.map((action, idx) => (
                <Col xs={8} sm={8} md={4} key={idx} style={{ textAlign: 'center' }}>
                  <div 
                    className="quick-action-btn"
                    onClick={() => navigate(action.path)}
                    style={{ 
                      width: 56, height: 56, borderRadius: 16, background: action.bg, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      margin: '0 auto 8px auto', cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <span style={{ color: action.color, fontSize: 24 }}>{action.icon}</span>
                  </div>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{action.label}</Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card 
            title={<Title level={5} style={{ margin: 0 }}>Lịch sử giao dịch</Title>}
            className="glass-card" 
            style={{ borderRadius: 24 }}
            styles={{ body: { padding: 0 } }}
            extra={<a onClick={() => navigate('/app/history')} style={{ cursor: 'pointer', color: '#0ea5e9' }}>Xem tất cả</a>}
          >
            {isLoading ? (
              <div style={{ padding: 24 }}>
                <Skeleton active avatar paragraph={{ rows: 1 }} />
                <Divider />
                <Skeleton active avatar paragraph={{ rows: 1 }} />
              </div>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={dashboardData?.recentTransactions || []}
                renderItem={item => {
                  const isNegative = item.type === 'expense';
                  return (
                    <List.Item className="transaction-item" style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            size="large"
                            style={{ 
                              backgroundColor: isNegative ? '#fee2e2' : '#dcfce7',
                              color: isNegative ? '#ef4444' : '#22c55e',
                              borderRadius: 12
                            }} 
                            icon={isNegative ? <ArrowDownOutlined /> : <ArrowUpOutlined />} 
                          />
                        }
                        title={<Text strong style={{ fontSize: 15, color: '#0f172a' }}>{item.displayTitle}</Text>}
                        description={<Text type="secondary" style={{ fontSize: 13 }}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>}
                      />
                      <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ color: isNegative ? '#ef4444' : '#22c55e', fontSize: 16 }}>
                          {isNegative ? '-' : '+'}{item.displayAmount?.toLocaleString('vi-VN') || 0} đ
                        </Text>
                        <br/>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.serviceId ? item.serviceId.replace('_', ' ') : ''}</Text>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
