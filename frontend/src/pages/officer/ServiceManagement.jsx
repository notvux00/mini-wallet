import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, Space, Button, Modal, Form, Input, Popconfirm, message } from 'antd';
import { PlusOutlined, SettingOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';

const { Text } = Typography;

export default function ServiceManagement() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/officer/services/list');
      if (res.data && res.data.data && res.data.data.items) {
        setData(res.data.data.items.map(s => ({ ...s, key: s.id || s._id })));
      }
    } catch (error) {
      message.error('Lỗi khi tải danh sách dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggleStatus = (record) => {
    // TBD: Backend API to toggle status
    message.info('Tính năng đổi trạng thái chưa được nối API!');
  };

  const handleAddService = () => {
    // Chuyển hướng sang ServiceBuilder thay vì dùng Modal cũ
    navigate('/officer/service-builder');
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
            onClick={() => navigate(`/officer/service-builder/${record.key}`)}
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
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={handleAddService}>
          New Service
        </Button>
      </div>

      <Card className="glass-card" styles={{ body: { padding: 0, overflow: 'hidden' } }}>
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
