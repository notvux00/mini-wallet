import React from 'react';
import { Card, Typography, Table, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function TransactionHistory() {
  const columns = [
    { title: 'Trans Ref ID', dataIndex: 'transRefId', key: 'transRefId', align: 'center', render: text => <Text code strong>{text}</Text> },
    { title: 'Service ID', dataIndex: 'serviceId', key: 'serviceId', align: 'center', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Sender Pocket', dataIndex: 'sender', key: 'sender', align: 'center', render: text => <Text copyable>{text}</Text> },
    { title: 'Receiver Pocket', dataIndex: 'receiver', key: 'receiver', align: 'center', render: text => <Text copyable>{text}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: text => <Text strong>{text.toLocaleString()}</Text> },
    { title: 'Fee', dataIndex: 'fee', key: 'fee', align: 'right', render: text => <Text type="danger">{text.toLocaleString()}</Text> },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: text => <Text type="success" strong>{text.toLocaleString()}</Text> },
    { title: 'Biller Ref ID', dataIndex: 'billerRefId', key: 'billerRefId', align: 'center', render: text => text ? <Text code>{text}</Text> : <Text type="secondary" italic>N/A</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center', render: text => <Tag color="success" icon={<CheckCircleOutlined />}>{text.toUpperCase()}</Tag> },
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', align: 'center' }
  ];

  const data = [
    { 
      key: '1', 
      transRefId: '64f1a2b3c4d5e6f7a8b9c0d1', 
      serviceId: 'P2P_TRANSFER', 
      sender: 'pkt_cust_001', 
      receiver: 'pkt_cust_002', 
      amount: 50000, 
      fee: 0, 
      totalAmount: 50000, 
      billerRefId: null, 
      status: 'done', 
      createdAt: '2026-06-25 14:00:05' 
    },
    { 
      key: '2', 
      transRefId: '64f1a2b3c4d5e6f7a8b9c0d3', 
      serviceId: 'BILL_PAYMENT', 
      sender: 'pkt_cust_001', 
      receiver: 'pkt_water_042', 
      amount: 150000, 
      fee: 2000, 
      totalAmount: 152000, 
      billerRefId: 'INV_2026_06_123', 
      status: 'done', 
      createdAt: '2026-06-25 14:30:10' 
    },
  ];

  return (
    <div>
      <Card className="glass-card" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
        <Table columns={columns} dataSource={data} pagination={false} rowClassName="smart-row" />
      </Card>
    </div>
  );
}
