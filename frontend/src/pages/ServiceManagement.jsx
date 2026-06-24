import React from 'react';
import { Card, Typography, Table, Tag, Space, Button } from 'antd';
import { PlusOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function ServiceManagement() {
  const navigate = useNavigate();

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: text => <Text strong>{text}</Text> },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: () => <Tag color="success">Active</Tag> },
    { title: 'Action', key: 'action', render: () => (
      <Space>
        <Button size="small" icon={<EditOutlined />}>Edit</Button>
        <Button size="small" type="primary" icon={<SettingOutlined />} onClick={() => navigate('/transaction-design')}>Config</Button>
      </Space>
    )}
  ];

  const data = [
    { key: '1', code: 'P2P_TRANSFER', name: 'Chuyển tiền P2P' },
    { key: '2', code: 'CASH_IN', name: 'Nạp tiền vào ví' },
    { key: '3', code: 'BILL_PAYMENT', name: 'Thanh toán hoá đơn' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" shape="round" icon={<PlusOutlined />}>New Service</Button>
      </div>
      <Card className="glass-card">
        <Table columns={columns} dataSource={data} pagination={false} />
      </Card>
    </div>
  );
}
