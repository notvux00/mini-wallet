import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, Table, Tag, Button, Space, Popconfirm, Modal, Form, Input, Row, Col, message, Select, Collapse } from 'antd';
import { PlusOutlined, StopOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons';

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
        status: item.status,
        inqReqKeyCustomer: item.inqReqKeyCustomer,
        inqReqKeyBiller: item.inqReqKeyBiller,
        inquiryResMappingAmount: item.inquiryResMappingAmount,
        inquiryResMappingBillRef: item.inquiryResMappingBillRef,
        payReqKeyCustomer: item.payReqKeyCustomer,
        payReqKeyAmount: item.payReqKeyAmount,
        payReqKeyBillRef: item.payReqKeyBillRef,
        payResMappingStatus: item.payResMappingStatus,
        payResMappingSuccessValue: item.payResMappingSuccessValue,
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
  const [editingBiller, setEditingBiller] = useState(null);
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

  const handleSubmit = async (values) => {
    try {
      if (editingBiller) {
        await axios.post('/api/officer/billers/update', { ...values, id: editingBiller.key });
        message.success(`Cập nhật Biller ${values.code} thành công.`);
      } else {
        await axios.post('/api/officer/billers/create', values);
        message.success(`Tạo mới Biller ${values.code} thành công.`);
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingBiller(null);
      
      fetchBillers(pagination.current, filterStatus, searchKeyword);
    } catch (error) {
      message.error(error.response?.data?.message || (editingBiller ? 'Lỗi khi cập nhật Biller!' : 'Lỗi khi tạo Biller!'));
    }
  };

  const handleEdit = async (record) => {
    // The record in the table only has basic fields. 
    // We need to fetch the full Biller from the server to populate the form, 
    // or we can just send the current record if it has everything. 
    // Wait, the list API doesn't return mapping fields. 
    // Let me update the list API in OfficerBillerController to return mapping fields.
    // Or I can just fetch it here. We don't have a get by id API.
    // Let's assume the list API returns it. Wait, I'll update OfficerBillerController to return everything.
    setEditingBiller(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      inquiryUrl: record.inquiryUrl,
      paymentUrl: record.paymentUrl,
      inqReqKeyCustomer: record.inqReqKeyCustomer || 'customerCode',
      inqReqKeyBiller: record.inqReqKeyBiller || 'billerCode',
      inquiryResMappingAmount: record.inquiryResMappingAmount || 'data.amountOwed',
      inquiryResMappingBillRef: record.inquiryResMappingBillRef || 'data.billRef',
      payReqKeyCustomer: record.payReqKeyCustomer || 'customerCode',
      payReqKeyAmount: record.payReqKeyAmount || 'amount',
      payReqKeyBillRef: record.payReqKeyBillRef || 'billRef',
      payResMappingStatus: record.payResMappingStatus || 'status',
      payResMappingSuccessValue: record.payResMappingSuccessValue || 'success',
    });
    setIsModalVisible(true);
  };

  const showAddModal = () => {
    setEditingBiller(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const columns = [
    { title: 'Mã Biller', dataIndex: 'code', key: 'code', align: 'center', width: '15%', render: text => <Text strong>{text}</Text> },
    { title: 'Tên hiển thị', dataIndex: 'name', key: 'name', align: 'center', width: '20%' },
    { title: 'Inquiry URL', dataIndex: 'inquiryUrl', key: 'inquiryUrl', align: 'center', width: '20%', ellipsis: true, render: text => <a title={text}>{text}</a> },
    { title: 'Payment URL', dataIndex: 'paymentUrl', key: 'paymentUrl', align: 'center', width: '15%', ellipsis: true, render: text => <a title={text}>{text}</a> },
    { title: 'Ví nhận tiền', dataIndex: 'pocket', key: 'pocket', align: 'center', width: '15%', render: text => <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', width: '10%', render: text => <Tag color={text === 'active' ? 'processing' : 'error'} style={{ margin: 0 }}>{text.toUpperCase()}</Tag> },
    { title: 'Thao tác', key: 'action', align: 'center', width: '10%', render: (_, record) => (
      <Space>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#0ea5e9' }} />
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
      </Space>
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
        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={showAddModal} style={{ background: '#0ea5e9' }}>Thêm Nhà cung cấp</Button>
      </div>
      <Card className="glass-card" styles={{ body: { padding: 0, overflow: 'hidden' } }}>
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
        title={<div style={{ fontSize: 18 }}><PlusOutlined style={{ color: '#0ea5e9', marginRight: 8 }}/> {editingBiller ? 'Chỉnh sửa Nhà cung cấp' : 'Thêm Nhà cung cấp mới'}</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Biller Code" name="code" rules={[{ required: true, message: 'Vui lòng nhập mã Biller' }]}>
                <Input placeholder="VD: WATER_HCM" size="large" disabled={!!editingBiller} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Display Name" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị' }]}>
                <Input placeholder="VD: Cấp nước TP.HCM" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Inquiry URL (Step 3.1)" name="inquiryUrl">
            <Input placeholder="https://api.domain.com/inquiry (Bỏ trống nếu không cần)" size="large" />
          </Form.Item>
          <Form.Item label="Payment URL (Step 5.1)" name="paymentUrl" rules={[{ required: true, message: 'Vui lòng nhập URL thanh toán' }]}>
            <Input placeholder="https://api.domain.com/pay" size="large" />
          </Form.Item>

          <Collapse style={{ marginTop: 16 }}>
            <Collapse.Panel header="Cấu hình API Mapping (Nâng cao)" key="1" forceRender={true}>
              <Row gutter={16}>
                <Col span={24}>
                  <Text strong>Khâu Tra Cứu (Inquiry)</Text>
                </Col>
                <Col span={12}>
                  <Form.Item label="Tên biến Mã Khách Hàng (Req)" name="inqReqKeyCustomer" initialValue="customerCode">
                    <Input placeholder="VD: ma_khach_hang" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Tên biến Mã Dịch Vụ (Req)" name="inqReqKeyBiller" initialValue="billerCode">
                    <Input placeholder="VD: provider_code" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Amount Mapping (JSONPath)" name="inquiryResMappingAmount" initialValue="data.amountOwed">
                    <Input placeholder="VD: data.amountOwed" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Bill Ref Mapping (JSONPath)" name="inquiryResMappingBillRef" initialValue="data.billRef">
                    <Input placeholder="VD: data.billRef" />
                  </Form.Item>
                </Col>
                
                <Col span={24} style={{ marginTop: 16 }}>
                  <Text strong>Khâu Thanh Toán (Pay)</Text>
                </Col>
                <Col span={12}>
                  <Form.Item label="Biến Mã KH (Req)" name="payReqKeyCustomer" initialValue="customerCode">
                    <Input placeholder="VD: ma_khach_hang" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Biến Số Tiền (Req)" name="payReqKeyAmount" initialValue="amount">
                    <Input placeholder="VD: amount" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Biến Mã HĐ (Req)" name="payReqKeyBillRef" initialValue="billRef">
                    <Input placeholder="VD: bill_id" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Status Mapping (JSONPath)" name="payResMappingStatus" initialValue="status">
                    <Input placeholder="VD: status" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Success Value" name="payResMappingSuccessValue" initialValue="success">
                    <Input placeholder="VD: success" />
                  </Form.Item>
                </Col>
              </Row>
            </Collapse.Panel>
          </Collapse>

          <Form.Item style={{ marginBottom: 0, marginTop: 32, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)} size="large">Hủy bỏ</Button>
              <Button type="primary" htmlType="submit" size="large" style={{ background: '#0ea5e9' }}>
                {editingBiller ? 'Cập nhật Biller' : 'Tạo Biller'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
