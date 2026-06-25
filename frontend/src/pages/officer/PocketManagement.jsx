import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Button, Modal, Form, Select, InputNumber, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, WalletOutlined, SafetyCertificateFilled, WarningFilled, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export default function PocketManagement() {
  const columns = [
    { title: 'Pocket ID', dataIndex: 'id', key: 'id', align: 'center', width: '15%', render: text => <Text strong>{text}</Text> },
    { title: 'User Ref', dataIndex: 'user', key: 'user', align: 'center', width: '15%', render: text => text ? <Text code>{text}</Text> : <Text type="secondary" italic>NULL</Text> },
    { title: 'Client', dataIndex: 'client', key: 'client', align: 'center', width: '10%', render: text => <Tag color={text === 'system' || text === 'bank' ? 'purple' : 'blue'}>{text.toUpperCase()}</Tag> },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', align: 'center', width: '10%' },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', align: 'center', width: '15%', render: text => <Text type="success" strong>{text.toLocaleString()}</Text> },
    { title: 'State (Lock)', dataIndex: 'state', key: 'state', align: 'center', width: '10%', render: text => <Tag color={text === 'active' ? 'success' : 'warning'} style={{ margin: 0 }}>{text === 'inProgress' ? 'LOCKED (ENGINE)' : text.toUpperCase()}</Tag> },
    { title: 'Status (Sys)', dataIndex: 'status', key: 'status', align: 'center', width: '10%', render: text => <Tag color={text === 'active' ? 'default' : 'error'} style={{ margin: 0 }}>{text.toUpperCase()}</Tag> },
    { title: 'Action', key: 'action', align: 'center', width: '10%', render: (_, record) => (
      <Space>
        <Popconfirm 
          title={record.status === 'active' ? "Vô hiệu hóa (Inactive) Pocket này?" : "Kích hoạt (Active) Pocket này?"} 
          onConfirm={() => togglePocketStatus(record)}
        >
          <Button 
            size="small" 
            danger={record.status === 'active'} 
            icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} 
            type="text"
            style={record.status !== 'active' ? { color: '#10b981' } : {}}
          >
            {record.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
        </Popconfirm>
      </Space>
    )}
  ];

  const [data, setData] = useState([
    { key: '1', id: 'sys_01', user: null, client: 'system', currency: 'VND', balance: 1500000, checksum: 'e10adc3949ba59abbe56e057f20f883e', state: 'active', status: 'active' },
    { key: '2', id: 'bank_01', user: null, client: 'bank', currency: 'VND', balance: 100000000, checksum: '5f4dcc3b5aa765d61d8327deb882cf99', state: 'active', status: 'active' },
    { key: '3', id: 'cust_88', user: 'customer_123', client: 'customer', currency: 'VND', balance: 50000, checksum: '202cb962ac59075b964b07152d234b70', state: 'inProgress', status: 'active' },
    { key: '4', id: 'biller_evn', user: 'biller_evn_1', client: 'biller', currency: 'VND', balance: 250000, checksum: 'caf1a3dfb505ffed0d024130f58c5cfa', state: 'active', status: 'active' },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const togglePocketStatus = (record) => {
    const updatedData = data.map(item => {
      if (item.key === record.key) {
        const newStatus = item.status === 'active' ? 'inactive' : 'active';
        message.success(`Pocket ${item.id} has been ${newStatus}.`);
        return { ...item, status: newStatus };
      }
      return item;
    });
    setData(updatedData);
  };

  const handleCreate = (values) => {
    const { client, currency, balance } = values;
    const prefix = client === 'system' ? 'sys_' : 'bank_';
    const newId = prefix + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    // Simulate MD5 hash creation
    const pseudoChecksum = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newPocket = {
      key: Date.now().toString(),
      id: newId,
      user: null, // System/Bank has no user
      client,
      currency,
      balance: balance || 0,
      checksum: pseudoChecksum,
      state: 'active',
      status: 'active'
    };

    setData([...data, newPocket]);
    message.success(`Tạo thành công ${client.toUpperCase()} Pocket với ID: ${newId}`);
    setIsModalVisible(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={showModal} style={{ background: '#0ea5e9' }}>Create System/Bank Pocket</Button>
      </div>
      <Card className="glass-card">
        <Table columns={columns} dataSource={data} pagination={false} rowClassName="smart-row" />
      </Card>

      <Modal
        title={<div style={{ fontSize: 18 }}><WalletOutlined style={{ color: '#0ea5e9', marginRight: 8 }}/> Create System / Bank Pocket</div>}
        open={isModalVisible}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText="Create Pocket"
        okButtonProps={{ style: { background: '#0ea5e9' } }}
        cancelText="Cancel"
        destroyOnClose
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleCreate}
          initialValues={{ currency: 'VND', balance: 0 }}
          style={{ marginTop: 24 }}
        >
          <Form.Item 
            label={<Text strong>Client</Text>} 
            name="client" 
            rules={[{ required: true, message: 'Vui lòng chọn loại chủ thể' }]}
          >
            <Select size="large" placeholder="Chọn System hoặc Bank">
              <Option value="system">System (Ví trung tâm gom phí, đối soát...)</Option>
              <Option value="bank">Bank (Ví ngân hàng chứa quỹ để Cash-in...)</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label={<Text strong>Currency</Text>} 
            name="currency" 
            rules={[{ required: true, message: 'Vui lòng nhập loại tiền tệ' }]}
          >
            <Select size="large">
              <Option value="VND">VND - Việt Nam Đồng</Option>
              <Option value="USD">USD - US Dollar</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label={<Text strong>Initial Balance</Text>} 
            name="balance"
            rules={[{ required: true, message: 'Vui lòng nhập số dư ban đầu' }]}
          >
            <InputNumber 
              size="large" 
              style={{ width: '100%' }} 
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(\.*)/g, '').replace(/,/g, '')}
              min={0}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
