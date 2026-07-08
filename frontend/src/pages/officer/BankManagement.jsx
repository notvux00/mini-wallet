import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, Table, Tag, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined, BankOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function BankManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchBanks = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/banks/list', {
        page: page,
        limit: pagination.pageSize
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
        key: item.id,
        code: item.code,
        name: item.name,
        pocketId: item.pocket ? item.pocket.id : null,
        status: item.status,
        createdAt: item.createdAt
      }));

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách Ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchBanks(newPagination.current);
  };

  const handleCreate = async (values) => {
    try {
      await axios.post('/api/officer/banks/create', values);
      message.success('Thêm Ngân hàng và tạo Ví tự động thành công!');
      setIsModalVisible(false);
      form.resetFields();
      fetchBanks(1);
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tạo Ngân hàng');
    }
  };

  const columns = [
    { title: 'Mã Ngân Hàng', dataIndex: 'code', key: 'code', align: 'center', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Tên Ngân Hàng', dataIndex: 'name', key: 'name', align: 'center', render: text => <Text strong>{text}</Text> },
    { title: 'ID Ví Kế toán (Pocket)', dataIndex: 'pocketId', key: 'pocketId', align: 'center', render: text => <Text code copyable>{text}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', render: text => <Tag color="success" icon={<CheckCircleOutlined />}>{text.toUpperCase()}</Tag> },
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
          dataSource={data} 
          loading={loading}
          pagination={pagination}
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
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="code" label="Mã Ngân Hàng (VD: VCB, TCB)" rules={[{ required: true }]}>
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
