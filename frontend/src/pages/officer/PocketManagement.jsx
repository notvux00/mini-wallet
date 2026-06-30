import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, Table, Tag, Button, Modal, Form, Select, InputNumber, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, WalletOutlined, SafetyCertificateFilled, WarningFilled, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export default function PocketManagement() {
  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Pocket ID', dataIndex: 'id', key: 'id', align: 'center', width: '15%', render: text => <Text strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'User Ref', dataIndex: 'user', key: 'user', align: 'center', width: '15%', render: text => text ? <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary" italic>NULL</Text> },
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

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filterClient, setFilterClient] = useState('');

  const fetchPockets = async (page = 1, client = filterClient) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/pockets/list', {
        page: page,
        limit: pagination.pageSize,
        client: client || undefined
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
        key: item.id,
        id: item.id,
        user: item.user,
        client: item.client,
        currency: item.currency,
        balance: item.balance,
        checksum: item.checksum,
        state: item.state,
        status: item.status
      }));

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách Ví');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPockets();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchPockets(newPagination.current);
  };

  const handleFilterChange = (value) => {
    setFilterClient(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchPockets(1, value);
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const togglePocketStatus = async (record) => {
    try {
      await axios.post('/api/officer/pockets/toggle-status', { id: record.key });
      
      const newStatus = record.status === 'active' ? 'inactive' : 'active';
      message.success(`Pocket ${formatId(record.id)} đã bị đổi thành ${newStatus.toUpperCase()}.`);
      
      fetchPockets(pagination.current, filterClient);
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái Ví');
    }
  };

  const handleCreate = async (values) => {
    try {
      await axios.post('/api/officer/pockets/create', values);
      
      message.success(`Tạo thành công ${values.client.toUpperCase()} Pocket!`);
      setIsModalVisible(false);
      form.resetFields();
      
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchPockets(1, filterClient);
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo Pocket!');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Select 
          value={filterClient} 
          style={{ width: 220 }} 
          size="large"
          onChange={handleFilterChange}
        >
          <Select.Option value="">Tất cả Client</Select.Option>
          <Select.Option value="customer">Khách hàng cá nhân (Customer)</Select.Option>
          <Select.Option value="biller">Nhà cung cấp (Biller)</Select.Option>
          <Select.Option value="system">Ví hệ thống trung tâm (System)</Select.Option>
          <Select.Option value="bank">Ví liên kết ngân hàng (Bank)</Select.Option>
        </Select>
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={showModal} style={{ background: '#0ea5e9' }}>Create System/Bank Pocket</Button>
      </div>
      <Card className="glass-card">
        <Table 
          columns={columns} 
          dataSource={data} 
          pagination={{ ...pagination, showSizeChanger: false }} 
          onChange={handleTableChange}
          loading={loading}
          rowClassName="smart-row" 
        />
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
