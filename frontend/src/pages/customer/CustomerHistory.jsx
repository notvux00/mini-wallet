import React from 'react';
import { Card, Typography, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function CustomerHistory() {
  const history = [
    { id: 'TXN125', type: 'P2P_TRANSFER', amount: -200000, date: '2026-06-25 10:15:00', status: 'done', desc: 'Transfer to 0912345678' },
    { id: 'TXN124', type: 'P2P_TRANSFER', amount: 50000, date: '2026-06-25 09:10:00', status: 'done', desc: 'Received from 0987654321' },
    { id: 'TXN123', type: 'P2P_TRANSFER', amount: -50000, date: '2026-06-25 08:30:00', status: 'done', desc: 'Transfer to 0912345678' },
    { id: 'TXN122', type: 'CASH_IN', amount: 500000, date: '2026-06-24 15:45:00', status: 'done', desc: 'Top up from Bank' },
    { id: 'TXN121', type: 'BILL_PAYMENT', amount: -150000, date: '2026-06-20 10:15:00', status: 'done', desc: 'EVN Bill Payment' },
  ];

  const columns = [
    {
      title: 'Time',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Description',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount) => {
        const isNegative = amount < 0;
        return (
          <strong style={{ color: isNegative ? '#ef4444' : '#22c55e' }}>
            {isNegative ? <ArrowDownOutlined style={{fontSize: 12, marginRight: 4}} /> : <ArrowUpOutlined style={{fontSize: 12, marginRight: 4}} />}
            {Math.abs(amount).toLocaleString('vi-VN')} đ
          </strong>
        );
      }
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      align: 'center',
      render: (type) => <Tag color="blue">{type}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => <Tag color="success">{status.toUpperCase()}</Tag>
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24, color: '#0f172a' }}>Transaction History</Title>
      <Card className="glass-card" style={{ borderRadius: 16 }}>
        <Table 
          columns={columns} 
          dataSource={history} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
