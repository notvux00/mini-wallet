 
import { useEffect, useContext } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Tag, Spin, Space } from 'antd';
import { 
  UserOutlined, 
  BankOutlined, 
  DollarOutlined, 
  TransactionOutlined 
} from '@ant-design/icons';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { SocketContext } from '../../context/SocketContext';
import { useDashboardStats } from '../../hooks/useOfficer';

const { Title, Text } = Typography;

export default function OfficerDashboard() {
  const { io } = useContext(SocketContext);
  
  const { data: stats, isLoading, refetch } = useDashboardStats();

  useEffect(() => {
    if (io && io.socket) {
      console.log('Registering socket listener in Officer Dashboard');
      io.socket.on('transaction_updated', (msg) => {
        console.log('Socket event received!', msg);
        refetch();
      });
    }
    // Cleanup is handled by SocketContext when unmounting/disconnecting
    return () => {
      if (io && io.socket) {
        io.socket.off('transaction_updated');
      }
    }
  }, [io, refetch]);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>;
  }

  if (!stats) return null;

  const { cards, chartData, statusCount, recentTransactions } = stats;

  const columns = [
    {
      title: 'Mã GD',
      dataIndex: 'id',
      key: 'id',
      render: (text) => <Text copyable={{ text }}>{text.substring(0, 8)}...</Text>
    },
    {
      title: 'Dịch vụ',
      key: 'service',
      render: (_, record) => record.service?.name || 'N/A'
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <Text strong style={{ color: '#0f172a' }}>{(val || 0).toLocaleString('vi-VN')} đ</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'success' ? 'success' : status === 'failed' ? 'error' : 'warning';
        return <Tag color={color}>{status?.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => new Date(val).toLocaleString('vi-VN')
    }
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        
        {/* CARDS */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="glass-card" style={{ borderRadius: 16 }}>
              <Statistic 
                title="Khách Hàng" 
                value={cards.totalCustomers} 
                prefix={<UserOutlined style={{ color: '#3b82f6' }} />} 
                valueStyle={{ color: '#0f172a', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="glass-card" style={{ borderRadius: 16 }}>
              <Statistic 
                title="Nhà cung cấp" 
                value={cards.totalBillers} 
                prefix={<BankOutlined style={{ color: '#8b5cf6' }} />} 
                valueStyle={{ color: '#0f172a', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="glass-card" style={{ borderRadius: 16 }}>
              <Statistic 
                title="Tổng GD (Thành công)" 
                value={cards.totalVolume} 
                prefix={<DollarOutlined style={{ color: '#10b981' }} />} 
                suffix="đ"
                valueStyle={{ color: '#0f172a', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="glass-card" style={{ borderRadius: 16 }}>
              <Statistic 
                title="Phí thu được" 
                value={cards.totalFees} 
                prefix={<TransactionOutlined style={{ color: '#f59e0b' }} />} 
                suffix="đ"
                valueStyle={{ color: '#0f172a', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* CHARTS */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card 
              title={<Title level={5} style={{ margin: 0 }}>Dòng tiền 7 ngày qua</Title>} 
              bordered={false} 
              className="glass-card" 
              style={{ borderRadius: 16, height: '100%' }}
            >
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(val) => `${val / 1000}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value.toLocaleString('vi-VN')} đ`, 'Doanh số']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              title={<Title level={5} style={{ margin: 0 }}>Tỉ lệ trạng thái</Title>} 
              bordered={false} 
              className="glass-card" 
              style={{ borderRadius: 16, height: '100%' }}
            >
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusCount}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusCount.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value, 'Giao dịch']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* RECENT TRANSACTIONS */}
        <Card 
          title={<Title level={5} style={{ margin: 0 }}>Giao dịch mới nhất</Title>} 
          bordered={false} 
          className="glass-card" 
          style={{ borderRadius: 16 }}
        >
          <Table 
            columns={columns} 
            dataSource={recentTransactions} 
            rowKey="id" 
            pagination={false}
            size="middle"
          />
        </Card>

      </Space>
    </div>
  );
}
