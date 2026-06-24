import React from 'react';
import { Card, Typography, Table, Tag } from 'antd';

const { Title, Text } = Typography;

export default function TransactionHistory() {
  const columns = [
    { title: 'Ref ID', dataIndex: 'refId', key: 'refId', render: text => <Text code>{text}</Text> },
    { title: 'Service', dataIndex: 'service', key: 'service' },
    { title: 'Sender', dataIndex: 'sender', key: 'sender' },
    { title: 'Receiver', dataIndex: 'receiver', key: 'receiver' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: text => <Text type="success" strong>{text.toLocaleString()}</Text> },
    { title: 'Fee', dataIndex: 'fee', key: 'fee', align: 'right', render: text => <Text type="danger">{text.toLocaleString()}</Text> },
    { title: 'Biller Ref', dataIndex: 'billerRef', key: 'billerRef' },
    { title: 'Time', dataIndex: 'time', key: 'time' }
  ];

  const data = [
    { key: '1', refId: 'tr_123', service: 'P2P_TRANSFER', sender: '098...', receiver: '091...', amount: 50000, fee: 100, billerRef: 'N/A', time: '14:00' },
    { key: '2', refId: 'tr_125', service: 'BILL_PAYMENT', sender: '098...', receiver: 'EVN_HN', amount: 100000, fee: 1000, billerRef: 'BILL_999', time: '14:10' },
  ];

  return (
    <div>
      <Card className="glass-card">
        <Table columns={columns} dataSource={data} pagination={false} />
      </Card>
    </div>
  );
}
