import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Space, Button, Modal, Form, Input } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function ServiceManagement() {
  const navigate = useNavigate();

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', align: 'center', width: '25%', render: text => <Text strong>{text}</Text> },
    { title: 'Name', dataIndex: 'name', key: 'name', align: 'center', width: '30%' },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center', width: '20%', render: (status) => <Tag color={status === 'active' ? 'success' : 'default'}>{status?.toUpperCase() || 'ACTIVE'}</Tag> },
    { title: 'Action', key: 'action', align: 'center', width: '25%', render: () => (
      <Space>
        <Button size="small" type="primary" icon={<SettingOutlined />} onClick={() => navigate('/admin/transaction-design')} style={{ background: '#0ea5e9' }}>Config</Button>
      </Space>
    )}
  ];

  const [data, setData] = useState([
    { key: '1', code: 'P2P_TRANSFER', name: 'Chuyển tiền P2P', status: 'active' },
    { key: '2', code: 'CASH_IN', name: 'Nạp tiền vào ví', status: 'active' },
    { key: '3', code: 'BILL_PAYMENT', name: 'Thanh toán hoá đơn', status: 'active' },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleAddService = () => {
    form.validateFields().then(values => {
      const newService = {
        key: Date.now().toString(),
        code: values.code,
        name: values.name,
        status: 'active'
      };
      setData([...data, newService]);
      setIsModalVisible(false);
      form.resetFields();
      navigate('/admin/transaction-design');
    }).catch(err => {
      console.log('Validation failed:', err);
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>New Service</Button>
      </div>
      <Card className="glass-card" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
        <Table columns={columns} dataSource={data} pagination={false} rowClassName="smart-row" />
      </Card>

      <Modal
        title="Create New Service"
        open={isModalVisible}
        onOk={handleAddService}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        okText="Create"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="Service Code" rules={[{ required: true, message: 'Please enter Service Code' }]}>
            <Input placeholder="e.g., TELCO_TOPUP" style={{ textTransform: 'uppercase' }} onChange={(e) => form.setFieldsValue({ code: e.target.value.toUpperCase() })} />
          </Form.Item>
          <Form.Item name="name" label="Service Name" rules={[{ required: true, message: 'Please enter Service Name' }]}>
            <Input placeholder="e.g., Nạp tiền điện thoại" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
