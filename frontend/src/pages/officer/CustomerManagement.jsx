import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { Card, Typography, Table, Button, Space, Modal, Form, InputNumber, Input, message, Row, Col, Select } from 'antd';
const { Option } = Select;
import { DollarOutlined, PlusOutlined, BankOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function CustomerManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filterPhone, setFilterPhone] = useState('');

  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  const fetchCustomers = async (page = 1, phone = filterPhone) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/officer/customers/list', {
        page: page,
        limit: pagination.pageSize,
        phone: phone || undefined
      });
      const { items, total } = response.data.data;
      
      const formattedData = items.map(item => ({
        key: item.id,
        phone: item.phone,
        name: item.name || 'Thành viên MiniWallet', // Backend Customer hiện tại chưa có trường name
        pocket: item.pocket ? item.pocket.id : 'N/A', 
        createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
        balance: item.pocket ? item.pocket.balance : 0 
      }));

      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, total: total }));
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleTableChange = (newPagination) => {
    fetchCustomers(newPagination.current);
  };

  const handleSearch = (value) => {
    setFilterPhone(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchCustomers(1, value);
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form] = Form.useForm();
  
  const [bankPockets, setBankPockets] = useState([]);
  const [cashInService, setCashInService] = useState(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    // Fetch bank pockets and cash-in service config
    const fetchConfigs = async () => {
      try {
        const pocketRes = await axios.post('/api/officer/pockets/list', { client: 'bank' });
        if (pocketRes.data?.data?.items) {
          setBankPockets(pocketRes.data.data.items.filter(p => p.status === 'active'));
        }

        const serviceRes = await axios.post('/api/officer/services/list', {});
        if (serviceRes.data?.data?.items) {
          const cInService = serviceRes.data.data.items.find(s => s.action === 'cashIn' && s.status === 'active');
          if (cInService) {
            const detailRes = await axios.post('/api/officer/services/detail', { id: cInService.id });
            if (detailRes.data?.data) {
              setCashInService({ ...cInService, ...detailRes.data.data });
            } else {
              setCashInService(cInService);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình Nạp tiền:', err);
      }
    };
    fetchConfigs();
  }, []);

  const handleCashInClick = (record) => {
    setSelectedCustomer(record);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleCashInSubmit = async (values) => {
    if (!cashInService) {
      return message.error('Không tìm thấy dịch vụ Nạp tiền (cashIn) đang active trong hệ thống.');
    }

    setExecuting(true);
    try {
      const actionParams = cashInService.serviceInfo?.actionParams || {};
      const bankFieldName = actionParams.bankPocketField || 'BANKID';
      const phoneFieldName = actionParams.receiverPhoneField || 'RECEIVERPHONE';

      // Nội suy trường số tiền từ cấu hình Kế toán
      let amountFieldName = 'AMOUNT';
      const acctSteps = cashInService.accountingSteps || [];
      if (acctSteps.length > 0) {
        amountFieldName = acctSteps[0].amount;
      } else if (cashInService.fields) {
        const amountFieldConf = cashInService.fields.find(f => f.fieldFormat === 'number');
        if (amountFieldConf) amountFieldName = amountFieldConf.fieldName;
      }

      // Nội suy trường ghi chú (nếu có cấu hình thì lấy, không thì mặc định NOTE)
      const noteField = cashInService.fields?.find(f => f.fieldName.toUpperCase().includes('NOTE') || f.fieldName.toUpperCase().includes('GHI'))?.fieldName || 'NOTE';

      const transData = {
        [phoneFieldName]: selectedCustomer.phone,
        [amountFieldName]: values.amount,
        [bankFieldName]: values.bankPocketId,
        [noteField]: values.note
      };

      await axios.post('/api/officer/cashin', {
        serviceId: cashInService.id || cashInService.serviceInfo?.serviceCode, // dự phòng
        transData
      });

      // Nếu không văng catch tức là API thành công
      message.success(`Nạp thành công ${values.amount.toLocaleString()} VND cho ${selectedCustomer.phone}`);
      setIsModalVisible(false);
      fetchCustomers(pagination.current); // Refresh data
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi nạp tiền.');
    } finally {
      setExecuting(false);
    }
  };

  const columns = [
    { title: 'Phone', dataIndex: 'phone', key: 'phone', align: 'center', width: '15%', render: text => <Text strong style={{ color: '#0f172a' }}>{text}</Text> },
    { title: 'Name', dataIndex: 'name', key: 'name', align: 'center', width: '20%' },
    { title: 'Pocket ID', dataIndex: 'pocket', key: 'pocket', align: 'center', width: '15%', render: text => text !== 'N/A' ? <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary">N/A</Text> },
    { title: 'Balance (VND)', dataIndex: 'balance', key: 'balance', align: 'center', width: '15%', render: text => <Text type="success" strong style={{ fontSize: 15 }}>{text.toLocaleString()}</Text> },
    { title: 'Registered At', dataIndex: 'createdAt', key: 'createdAt', align: 'center', width: '20%' },
    { title: 'Action', key: 'action', align: 'center', width: '15%', render: (_, record) => (
      <Space>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleCashInClick(record)} style={{ background: '#0ea5e9' }}>Cash In</Button>
      </Space>
    )}
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Input.Search 
          placeholder="Tìm kiếm theo Số điện thoại..." 
          allowClear
          onSearch={handleSearch} 
          style={{ width: 300 }} 
          size="large"
        />
      </div>
      <Card className="glass-card" styles={{ body: { padding: 0, overflow: 'hidden', marginBottom: 16 } }}>
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
        title={<div style={{ fontSize: 18 }}><DollarOutlined style={{ color: '#10b981', marginRight: 8 }}/> Nạp tiền tại quầy (OTC Cash In)</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={500}
      >
        {selectedCustomer && (
          <Form form={form} layout="vertical" onFinish={handleCashInSubmit} style={{ marginTop: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Customer Phone">
                  <Input value={selectedCustomer.phone} disabled size="large" style={{ color: '#0f172a', fontWeight: 600 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Target Pocket ID">
                  <Input value={selectedCustomer.pocket} disabled size="large" />
                </Form.Item>
              </Col>
            </Row>
            
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, marginBottom: 24, border: '1px solid #e2e8f0' }}>
              <Text style={{ color: '#64748b' }}>Current Balance:</Text>
              <Title level={2} style={{ margin: 0, color: '#10b981' }}>
                {selectedCustomer.balance.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 500 }}>VND</span>
              </Title>
            </div>

            <Form.Item 
              label={<Text strong>Trích từ Ví Ngân Hàng (Nguồn)</Text>} 
              name="bankPocketId" 
              rules={[{ required: true, message: 'Vui lòng chọn ví ngân hàng!' }]}
            >
              <Select size="large" placeholder="-- Chọn ví Ngân hàng --">
                {bankPockets.map(p => (
                  <Option key={p.id} value={p.id}>
                    <BankOutlined style={{ marginRight: 8, color: '#0ea5e9' }} />
                    {p.id.slice(-6)} - {p.currency} (Dư: {p.balance.toLocaleString('vi-VN')})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item 
              label={<Text strong>Top-up Amount (VND)</Text>} 
              name="amount" 
              rules={[{ required: true, message: 'Vui lòng nhập số tiền!' }]}
            >
              <InputNumber 
                size="large" 
                style={{ width: '100%', fontSize: 18 }} 
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(\.*)/g, '').replace(/,/g, '')}
                placeholder="Nhập số tiền..."
                min={1000}
                autoFocus
              />
            </Form.Item>

            <Form.Item label="Reason / Note" name="note">
              <Input.TextArea placeholder="Ghi chú giao dịch (ví dụ: Khách nộp tiền mặt)..." rows={3} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)} size="large">Hủy bỏ</Button>
                <Button type="primary" htmlType="submit" size="large" style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}>
                  Xác nhận Nạp tiền
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
