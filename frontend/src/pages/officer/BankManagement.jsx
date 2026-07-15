import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Button, Modal, Form, Input, notification, Space } from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useBanks, useCreateBank } from '../../hooks/useOfficer';

const { Text } = Typography;

export default function BankManagement() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Queries
  const { data: banksData, isLoading, refetch } = useBanks({
    page: pagination.current,
    limit: pagination.pageSize
  });

  // Mutations
  const createBankMutation = useCreateBank();

  const formattedData = banksData?.items?.map(item => ({
    key: item.id,
    code: item.code,
    name: item.name,
    pocketId: item.pocket ? item.pocket.id : null,
    status: item.status,
    createdAt: item.createdAt
  })) || [];

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const handleCreate = (values) => {
    createBankMutation.mutate(
      values,
      {
        onSuccess: () => {
          notification.success({ message: 'Thêm Ngân hàng và tạo Ví tự động thành công!' });
          setIsModalVisible(false);
          form.resetFields();
          setPagination(prev => ({ ...prev, current: 1 }));
          refetch();
        },
        onError: (error) => {
          notification.error({ message: error.message || 'Lỗi tạo Ngân hàng' });
        }
      }
    );
  };

  const columns = [
    { title: 'Mã Ngân Hàng', dataIndex: 'code', key: 'code', align: 'center', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Tên Ngân Hàng', dataIndex: 'name', key: 'name', align: 'center', render: text => <Text strong>{text}</Text> },
    { title: 'ID Ví Kế toán', dataIndex: 'pocketId', key: 'pocketId', align: 'center', render: text => <Text code copyable>{text}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', render: text => <Tag color="success" icon={<CheckCircleOutlined />}>{text?.toUpperCase()}</Tag> },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', align: 'center', render: text => new Date(text).toLocaleString('vi-VN') }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} style={{ background: '#0ea5e9' }}>
          Thêm Ngân Hàng
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={formattedData} 
          loading={isLoading}
          pagination={{ ...pagination, showSizeChanger: false, total: banksData?.total || 0 }}
          onChange={handleTableChange}
          bordered
        />
      </Card>

      <Modal
        title="Thêm Ngân Hàng Mới"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu & Tạo Ví"
        okButtonProps={{ loading: createBankMutation.isPending }}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="code" label="Mã Ngân Hàng" rules={[{ required: true }]}>
            <Input placeholder="VD: VCB" />
          </Form.Item>
          <Form.Item name="name" label="Tên Ngân Hàng" rules={[{ required: true }]}>
            <Input placeholder="VD: Ngân hàng Vietcombank" />
          </Form.Item>
          <div style={{ padding: '10px 15px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, color: '#166534' }}>
            <Text strong style={{ color: '#166534' }}>Lưu ý:</Text> Khi bấm Lưu, hệ thống sẽ tự động tạo ra một Ví Kế Toán riêng biệt cho ngân hàng này để phục vụ đối soát.
          </div>
        </Form>
      </Modal>
    </div>
  );
}
