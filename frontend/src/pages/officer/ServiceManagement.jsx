import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Space, Button, Modal, Form, Input, Popconfirm } from 'antd';
import { PlusOutlined, SettingOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

export default function ServiceManagement() {
  const navigate = useNavigate();

  const [data, setData] = useState([
    { key: '1', code: 'P2P_TRANSFER', name: 'Chuyển tiền P2P', status: 'active' },
    { key: '2', code: 'CASH_IN', name: 'Nạp tiền vào ví', status: 'active' },
    { key: '3', code: 'BILL_PAYMENT', name: 'Thanh toán hoá đơn', status: 'active' },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleToggleStatus = (record) => {
    setData(prev => prev.map(item =>
      item.key === record.key
        ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
        : item
    ));
  };

  const handleAddService = () => {
    form.validateFields().then(values => {
      const newService = {
        key: Date.now().toString(),
        code: values.code,
        name: values.name,
        status: 'active',
      };
      setData(prev => [...prev, newService]);
      setIsModalVisible(false);
      form.resetFields();
    }).catch(err => {
      console.log('Validation failed:', err);
    });
  };

  const columns = [
    {
      title: 'Code', dataIndex: 'code', key: 'code', align: 'center', width: '25%',
      render: text => <Text strong>{text}</Text>,
    },
    { title: 'Name', dataIndex: 'name', key: 'name', align: 'center', width: '25%' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', align: 'center', width: '15%',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status?.toUpperCase() || 'ACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Action', key: 'action', align: 'center', width: '35%',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => navigate('/officer/transaction-design')}
            style={{ background: '#0ea5e9' }}
          >
            Config
          </Button>
          <Popconfirm
            title={record.status === 'active' ? 'Deactivate service?' : 'Activate service?'}
            description={
              record.status === 'active'
                ? 'Customers will not be able to use this service.'
                : 'This service will become available to customers.'
            }
            onConfirm={() => handleToggleStatus(record)}
            okText="Confirm"
            cancelText="Cancel"
            okButtonProps={{ danger: record.status === 'active' }}
          >
            <Button
              size="small"
              icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              danger={record.status === 'active'}
              style={record.status !== 'active' ? { color: '#16a34a', borderColor: '#16a34a' } : {}}
            >
              {record.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          New Service
        </Button>
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
            <Input
              placeholder="e.g., TELCO_TOPUP"
              onChange={(e) => form.setFieldsValue({ code: e.target.value.toUpperCase() })}
            />
          </Form.Item>
          <Form.Item name="name" label="Service Name" rules={[{ required: true, message: 'Please enter Service Name' }]}>
            <Input placeholder="e.g., Nạp tiền điện thoại" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
