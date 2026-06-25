import React from 'react';
import { Card, Typography, Row, Col, Statistic, Button, List, Avatar, Tag, Space, Divider } from 'antd';
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
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function CustomerDashboard() {
  const navigate = useNavigate();

  // Mock data
  const balance = 1500000;
  const monthlyIncome = 2500000;
  const monthlyExpense = 1000000;
  
  const history = [
    { id: 'TXN125', type: 'P2P_TRANSFER', amount: -200000, date: '2026-06-25 10:15:00', status: 'done', desc: 'Transfer to 0912345678' },
    { id: 'TXN124', type: 'P2P_TRANSFER', amount: 50000, date: '2026-06-25 09:10:00', status: 'done', desc: 'Received from 0987654321' },
    { id: 'TXN123', type: 'P2P_TRANSFER', amount: -50000, date: '2026-06-25 08:30:00', status: 'done', desc: 'Transfer to 0912345678' },
  ];

  const quickActions = [
    { icon: <SwapOutlined />, label: 'Transfer', path: '/app/transfer', color: '#0ea5e9', bg: '#e0f2fe' },
    { icon: <FileTextOutlined />, label: 'Pay Bill', path: '/app/bill-payment', color: '#8b5cf6', bg: '#ede9fe' },
    { icon: <MobileOutlined />, label: 'Topup Phone', path: '/app/coming-soon', color: '#10b981', bg: '#d1fae5' },
    { icon: <QrcodeOutlined />, label: 'QR Pay', path: '/app/coming-soon', color: '#f59e0b', bg: '#fef3c7' },
    { icon: <BankOutlined />, label: 'Bank Link', path: '/app/coming-soon', color: '#ec4899', bg: '#fce7f3' },
    { icon: <HistoryOutlined />, label: 'History', path: '/app/history', color: '#64748b', bg: '#f1f5f9' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>Good Morning, Nguyen!</Title>
        <Text style={{ color: '#64748b' }}>Here is a summary of your wallet today.</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card 
            style={{ 
              borderRadius: 24, 
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#fff',
              border: 'none',
              height: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <WalletOutlined style={{ fontSize: 20, marginRight: 8, color: '#94a3b8' }} />
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>Available Balance</Text>
                </div>
                <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 800, fontSize: 36 }}>
                  {balance.toLocaleString('vi-VN')} <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 600 }}>VND</span>
                </Title>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>M</span>
              </div>
            </div>
            
            <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />
            
            <Row>
              <Col span={12}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>This Month Income</Text>
                <Space>
                  <ArrowUpOutlined style={{ color: '#34d399' }} />
                  <Text style={{ color: '#fff', fontWeight: 600 }}>+{monthlyIncome.toLocaleString('vi-VN')} đ</Text>
                </Space>
              </Col>
              <Col span={12}>
                <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>This Month Expense</Text>
                <Space>
                  <ArrowDownOutlined style={{ color: '#f87171' }} />
                  <Text style={{ color: '#fff', fontWeight: 600 }}>-{monthlyExpense.toLocaleString('vi-VN')} đ</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card 
            title={<Title level={5} style={{ margin: 0 }}>Quick Actions</Title>}
            className="glass-card" 
            style={{ borderRadius: 24, height: '100%' }}
          >
            <Row gutter={[16, 24]}>
              {quickActions.map((action, idx) => (
                <Col xs={8} sm={8} md={4} key={idx} style={{ textAlign: 'center' }}>
                  <div 
                    onClick={() => navigate(action.path)}
                    style={{ 
                      width: 56, height: 56, borderRadius: 16, background: action.bg, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      margin: '0 auto 8px auto', cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
            title={<Title level={5} style={{ margin: 0 }}>Recent Transactions</Title>}
            className="glass-card" 
            style={{ borderRadius: 24 }}
            bodyStyle={{ padding: 0 }}
            extra={<Button type="link" onClick={() => navigate('/app/history')}>View All</Button>}
          >
            <List
              itemLayout="horizontal"
              dataSource={history}
              renderItem={item => {
                const isNegative = item.amount < 0;
                return (
                  <List.Item style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
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
                      title={<Text strong style={{ fontSize: 15, color: '#0f172a' }}>{item.desc}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 13 }}>{item.date}</Text>}
                    />
                    <div style={{ textAlign: 'right' }}>
                      <Text strong style={{ color: isNegative ? '#ef4444' : '#22c55e', fontSize: 16 }}>
                        {isNegative ? '' : '+'}{item.amount.toLocaleString('vi-VN')} đ
                      </Text>
                      <br/>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.type.replace('_', ' ')}</Text>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
