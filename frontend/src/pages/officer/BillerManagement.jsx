import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, Table, Tag, Button, Space, Popconfirm, Modal, Form, Input, Row, Col, message, Select } from 'antd';
import { PlusOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function BillerManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchBillers = async (page = 1, status = filterStatus, search = searchKeyword) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/billers/list', {
        page: page,
        limit: pagination.pageSize,
        status: status || undefined,
        search: search || undefined
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
        key: item.id,
        code: item.code,
        name: item.name,
        inquiryUrl: item.inquiryUrl,
        paymentUrl: item.paymentUrl,
        pocket: item.pocket,
        status: item.status
      }));

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách Biller');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillers();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchBillers(newPagination.current);
  };

  const handleFilterChange = (value) => {
    setFilterStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchBillers(1, value, searchKeyword);
  };

  const handleSearch = (value) => {
    setSearchKeyword(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchBillers(1, filterStatus, value);
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const toggleStatus = async (record) => {
    try {
      await axios.post('/api/officer/billers/toggle-status', { id: record.key });
      const newStatus = record.status === 'active' ? 'inactive' : 'active';
      message.success(`Biller ${record.code} đã được chuyển sang trạng thái ${newStatus.toUpperCase()}.`);
      
      fetchBillers(pagination.current, filterStatus, searchKeyword);
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái Biller');
    }
  };

  const handleAddSubmit = async (values) => {
    try {
      await axios.post('/api/officer/billers/create', values);
      message.success(`Tạo mới Biller ${values.code} thành công.`);
      setIsModalVisible(false);
      form.resetFields();
      
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchBillers(1, filterStatus, searchKeyword);
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo Biller!');
    }
  };

  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', align: 'center', width: '15%', render: text => <Text strong>{text}</Text> },
    { title: 'Name', dataIndex: 'name', key: 'name', align: 'center', width: '20%' },
    { title: 'Inquiry URL', dataIndex: 'inquiryUrl', key: 'inquiryUrl', align: 'center', width: '20%', ellipsis: true, render: text => <a title={text}>{text}</a> },
    { title: 'Payment URL', dataIndex: 'paymentUrl', key: 'paymentUrl', align: 'center', width: '15%', ellipsis: true, render: text => <a title={text}>{text}</a> },
    { title: 'Receive Pocket ID', dataIndex: 'pocket', key: 'pocket', align: 'center', width: '15%', render: text => <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', align: 'center', width: '10%', render: text => <Tag color={text === 'active' ? 'processing' : 'error'} style={{ margin: 0 }}>{text.toUpperCase()}</Tag> },
    { title: 'Action', key: 'action', align: 'center', width: '5%', render: (_, record) => (
      <Popconfirm 
        title={record.status === 'active' ? "Vô hiệu hóa Biller này?" : "Kích hoạt Biller này?"} 
        onConfirm={() => toggleStatus(record)}
      >
        <Button 
          size="small" 
          danger={record.status === 'active'} 
          icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} 
          type="text"
          style={record.status !== 'active' ? { color: '#10b981' } : {}}
        />
      </Popconfirm>
    )}
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input.Search 
            placeholder="Tìm theo Code hoặc Name..." 
            allowClear
            onSearch={handleSearch} 
            style={{ width: 250 }} 
            size="large"
          />
          <Select 
            value={filterStatus} 
            style={{ width: 180 }} 
            size="large"
            onChange={handleFilterChange}
          >
            <Select.Option value="">Tất cả trạng thái</Select.Option>
            <Select.Option value="active">Đang hoạt động (Active)</Select.Option>
            <Select.Option value="inactive">Đã khóa (Inactive)</Select.Option>
          </Select>
        </Space>
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} style={{ background: '#0ea5e9' }}>Add Biller</Button>
      </div>
      <Card className="glass-card" bodyStyle={{ padding: 0, overflow: 'hidden' }}>
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
        title={<div style={{ fontSize: 18 }}><PlusOutlined style={{ color: '#0ea5e9', marginRight: 8 }}/> Thêm Biller mới</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAddSubmit} style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Biller Code" name="code" rules={[{ required: true, message: 'Vui lòng nhập mã Biller' }]}>
                <Input placeholder="VD: WATER_HCM" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Display Name" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị' }]}>
                <Input placeholder="VD: Cấp nước TP.HCM" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Inquiry URL (Step 3.1)" name="inquiryUrl" rules={[{ required: true, message: 'Vui lòng nhập URL tra cứu' }]}>
            <Input placeholder="https://api.domain.com/inquiry" size="large" />
          </Form.Item>
          <Form.Item label="Payment URL (Step 5.1)" name="paymentUrl" rules={[{ required: true, message: 'Vui lòng nhập URL thanh toán' }]}>
            <Input placeholder="https://api.domain.com/pay" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 32, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)} size="large">Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" size="large" style={{ background: '#0ea5e9' }}>
                Tạo Biller
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
