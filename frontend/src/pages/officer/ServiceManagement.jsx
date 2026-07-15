import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Space, Button, Modal, Form, Input, Popconfirm, notification } from 'antd';
import { PlusOutlined, SettingOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useServices, useToggleServiceStatus } from '../../hooks/useOfficer';

const { Text } = Typography;

export default function ServiceManagement() {
  const navigate = useNavigate();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Queries
  const { data: servicesData, isLoading, refetch } = useServices({});
  
  // Mutations
  const toggleStatusMutation = useToggleServiceStatus();

  const services = servicesData?.items?.map(s => ({ ...s, key: s.id || s._id })) || [];

  const handleToggleStatus = (record) => {
    toggleStatusMutation.mutate(
      { id: record.key },
      {
        onSuccess: () => {
          notification.success({ message: `Đã ${record.status === 'active' ? 'deactivate' : 'activate'} dịch vụ "${record.name}"` });
          refetch();
        },
        onError: (error) => {
          notification.error({ message: error.message || 'Lỗi khi đổi trạng thái dịch vụ.' });
        }
      }
    );
  };

  const handleAddService = () => {
    navigate('/officer/service-builder');
  };

  const columns = [
    {
      title: 'Mã Dịch Vụ', dataIndex: 'code', key: 'code', align: 'center', width: '25%',
      render: text => <Text strong>{text}</Text>,
    },
    { title: 'Tên Dịch Vụ', dataIndex: 'name', key: 'name', align: 'center', width: '25%' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', width: '15%',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status?.toUpperCase() || 'ACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác', key: 'action', align: 'center', width: '35%',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => navigate(`/officer/service-builder/${record.key}`)}
            style={{ background: '#0ea5e9' }}
          >
            Cấu hình
          </Button>
          <Popconfirm
            title={record.status === 'active' ? 'Vô hiệu hóa dịch vụ?' : 'Kích hoạt dịch vụ?'}
            description={
              record.status === 'active'
                ? 'Khách hàng sẽ không thể sử dụng dịch vụ này.'
                : 'Dịch vụ này sẽ hiển thị cho khách hàng sử dụng.'
            }
            onConfirm={() => handleToggleStatus(record)}
            okText="Xác nhận"
            cancelText="Hủy bỏ"
            okButtonProps={{ danger: record.status === 'active', loading: toggleStatusMutation.isPending }}
          >
            <Button
              size="small"
              icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              danger={record.status === 'active'}
              style={record.status !== 'active' ? { color: '#16a34a', borderColor: '#16a34a' } : {}}
            >
              {record.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
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
          Dịch vụ mới
        </Button>
      </div>

      <Card className="glass-card" styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <Table columns={columns} dataSource={services} pagination={false} loading={isLoading} rowClassName="smart-row" />
      </Card>

      <Modal
        title="Tạo Dịch vụ mới"
        open={isModalVisible}
        onOk={handleAddService}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        okText="Tạo"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="Mã dịch vụ" rules={[{ required: true, message: 'Vui lòng nhập Mã Dịch Vụ' }]}>
            <Input
              placeholder="VD: TELCO_TOPUP"
              onChange={(e) => form.setFieldsValue({ code: e.target.value.toUpperCase() })}
            />
          </Form.Item>
          <Form.Item name="name" label="Tên dịch vụ" rules={[{ required: true, message: 'Vui lòng nhập Tên Dịch Vụ' }]}>
            <Input placeholder="VD: Nạp tiền điện thoại" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
