import React from 'react';
import { Card, Typography, Table, Tag, Button } from 'antd';

const { Title, Text } = Typography;

export default function TransactionTrail() {
  const columns = [
    { title: 'Ref ID', dataIndex: 'refId', key: 'refId', render: text => <Text code>{text}</Text> },
    { title: 'Service', dataIndex: 'service', key: 'service' },
    { title: 'Step', dataIndex: 'step', key: 'step' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: text => <Tag color={text === 'done' ? 'success' : text === 'failed' ? 'error' : 'warning'}>{text}</Tag> },
    { title: 'Time', dataIndex: 'time', key: 'time' },
    { title: 'Action', key: 'action', render: () => <Button size="small">View Logs</Button> }
  ];

  const data = [
    { key: '1', refId: 'tr_123', service: 'P2P_TRANSFER', step: 3, status: 'done', time: '24/06/2026 14:00' },
    { key: '2', refId: 'tr_124', service: 'BILL_PAYMENT', step: 2, status: 'failed', time: '24/06/2026 14:05' },
  ];

  return (
    <div>
      <Card className="glass-card">
        <Table columns={columns} dataSource={data} pagination={false} />
      </Card>
    </div>
  );
}
