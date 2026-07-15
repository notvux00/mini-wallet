import React, { useState, useEffect, useContext } from 'react';
import { Card, Typography, Table, Tag, Button, Modal, Form, Select, Input, InputNumber, notification, Space, Popconfirm } from 'antd';
import { PlusOutlined, WalletOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { SocketContext } from '../../context/SocketContext';
import { usePockets, useCreatePocket, useTogglePocketStatus } from '../../hooks/useOfficer';

const { Title, Text } = Typography;
const { Option } = Select;

export default function PocketManagement() {
  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filterClient, setFilterClient] = useState('');
  const { io } = useContext(SocketContext);

  // Queries
  const { data: pocketsData, isLoading: loadingPockets, refetch: refetchPockets } = usePockets({
    page: pagination.current,
    limit: pagination.pageSize,
    client: filterClient || undefined
  });

  // Mutations
  const createPocketMutation = useCreatePocket();
  const togglePocketStatusMutation = useTogglePocketStatus();

  const formattedData = pocketsData?.items?.map(item => ({
    key: item.id,
    id: item.id,
    name: item.name,
    user: item.user,
    client: item.client,
    currency: item.currency,
    balance: item.balance,
    checksum: item.checksum,
    state: item.state,
    status: item.status
  })) || [];

  useEffect(() => {
    if (io && io.socket) {
      io.socket.on('transaction_updated', () => refetchPockets());
      io.socket.on('customer_created', () => {
        setPagination(prev => ({ ...prev, current: 1 }));
        refetchPockets();
      });
    }
    return () => {
      if (io && io.socket) {
        io.socket.off('transaction_updated');
        io.socket.off('customer_created');
      }
    };
  }, [io, refetchPockets]);

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const handleFilterChange = (value) => {
    setFilterClient(value);
    setPagination(prev => ({ ...prev, current: 1 }));
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

  const togglePocketStatus = (record) => {
    togglePocketStatusMutation.mutate(
      { id: record.key },
      {
        onSuccess: () => {
          const newStatus = record.status === 'active' ? 'inactive' : 'active';
          notification.success({ message: `Pocket ${formatId(record.id)} đã bị đổi thành ${newStatus.toUpperCase()}.` });
          refetchPockets();
        },
        onError: (error) => {
          notification.error({ message: error.message || 'Lỗi khi cập nhật trạng thái Ví' });
        }
      }
    );
  };

  const handleCreate = (values) => {
    createPocketMutation.mutate(
      values,
      {
        onSuccess: () => {
          notification.success({ message: `Tạo thành công ${values.client.toUpperCase()} Pocket!` });
          setIsModalVisible(false);
          form.resetFields();
          setPagination(prev => ({ ...prev, current: 1 }));
          refetchPockets();
        },
        onError: (error) => {
          notification.error({ message: error.message || 'Lỗi khi tạo Pocket!' });
        }
      }
    );
  };

  const columns = [
    { title: 'Mã ví (Pocket ID)', dataIndex: 'id', key: 'id', align: 'center', width: '15%', render: text => <Text strong copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Tên ví', dataIndex: 'name', key: 'name', align: 'center', width: '15%', render: text => text ? <Text strong>{text}</Text> : <Text type="secondary" italic>Không tên</Text> },
    { title: 'Tham chiếu người dùng', dataIndex: 'user', key: 'user', align: 'center', width: '15%', render: text => text ? <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary" italic>Trống</Text> },
    { title: 'Loại chủ thể', dataIndex: 'client', key: 'client', align: 'center', width: '10%', render: text => <Tag color={text === 'system' || text === 'bank' ? 'purple' : 'blue'}>{text.toUpperCase()}</Tag> },
    { title: 'Tiền tệ', dataIndex: 'currency', key: 'currency', align: 'center', width: '10%' },
    { title: 'Số dư', dataIndex: 'balance', key: 'balance', align: 'center', width: '15%', render: text => <Text type="success" strong>{text.toLocaleString()}</Text> },
    { title: 'Trạng thái (Khóa)', dataIndex: 'state', key: 'state', align: 'center', width: '10%', render: text => <Tag color={text === 'active' ? 'success' : 'warning'} style={{ margin: 0 }}>{text === 'inProgress' ? 'ĐANG KHÓA (ENGINE)' : text.toUpperCase()}</Tag> },
    { title: 'Trạng thái (Hệ thống)', dataIndex: 'status', key: 'status', align: 'center', width: '10%', render: text => <Tag color={text === 'active' ? 'default' : 'error'} style={{ margin: 0 }}>{text.toUpperCase()}</Tag> },
    { title: 'Thao tác', key: 'action', align: 'center', width: '10%', render: (_, record) => (
      <Space>
        <Popconfirm 
          title={record.status === 'active' ? "Vô hiệu hóa (Inactive) Pocket này?" : "Kích hoạt (Active) Pocket này?"} 
          onConfirm={() => togglePocketStatus(record)}
          okButtonProps={{ loading: togglePocketStatusMutation.isPending }}
        >
          <Button 
            size="small" 
            danger={record.status === 'active'} 
            icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} 
            type="text"
            style={record.status !== 'active' ? { color: '#10b981' } : {}}
          >
            {record.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </Button>
        </Popconfirm>
      </Space>
    )}
  ];

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
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={showModal} style={{ background: '#0ea5e9' }}>Thêm Ví Hệ thống</Button>
      </div>
      <Card className="glass-card">
        <Table 
          columns={columns} 
          dataSource={formattedData} 
          pagination={{ ...pagination, showSizeChanger: false, total: pocketsData?.total || 0 }} 
          onChange={handleTableChange}
          loading={loadingPockets}
          rowClassName="smart-row" 
        />
      </Card>

      <Modal
        title={<div style={{ fontSize: 18 }}><WalletOutlined style={{ color: '#0ea5e9', marginRight: 8 }}/> Thêm Ví Hệ thống</div>}
        open={isModalVisible}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText="Tạo Ví"
        okButtonProps={{ style: { background: '#0ea5e9' }, loading: createPocketMutation.isPending }}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleCreate}
          initialValues={{ client: 'system', currency: 'VND', balance: 0 }}
          style={{ marginTop: 24 }}
        >
          <Form.Item 
            label={<Text strong>Tên ví (Tùy chọn)</Text>} 
            name="name" 
          >
            <Input size="large" placeholder="Ví dụ: Ví Tiền Mặt Tại Quầy, Ví Thu Phí..." />
          </Form.Item>

          <Form.Item 
            label={<Text strong>Client</Text>} 
            name="client" 
            rules={[{ required: true, message: 'Vui lòng chọn loại chủ thể' }]}
          >
            <Select size="large" placeholder="Chọn System">
              <Option value="system">System (Ví trung tâm gom phí, đối soát...)</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label={<Text strong>Tiền tệ</Text>} 
            name="currency" 
            rules={[{ required: true, message: 'Vui lòng nhập loại tiền tệ' }]}
          >
            <Select size="large">
              <Option value="VND">VND - Việt Nam Đồng</Option>
              <Option value="USD">USD - US Dollar</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label={<Text strong>Số dư ban đầu</Text>} 
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
