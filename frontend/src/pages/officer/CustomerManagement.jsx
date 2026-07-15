import React, { useState, useEffect, useContext } from 'react';
import { Card, Typography, Table, Button, Space, Modal, Form, InputNumber, Input, Row, Col, Select, notification } from 'antd';
const { Option } = Select;
import { DollarOutlined, PlusOutlined, WalletOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
import { SocketContext } from '../../context/SocketContext';
import { useCustomers, useExecuteTransaction, usePockets, useServices, useServiceDetail } from '../../hooks/useOfficer';

export default function CustomerManagement() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filterPhone, setFilterPhone] = useState('');
  const { io } = useContext(SocketContext);

  const formatId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  // Queries
  const { data: customerData, isLoading: loadingCustomers, refetch: refetchCustomers } = useCustomers({
    page: pagination.current,
    limit: pagination.pageSize,
    phone: filterPhone || undefined
  });

  const { data: otcPocketsData } = usePockets({ limit: 100, client: 'system' });
  const { data: servicesData } = useServices({});
  
  // Find cash-in service
  const cInService = servicesData?.items?.find(s => s.action === 'cashIn' && s.status === 'active');
  const { data: cashInServiceDetail } = useServiceDetail({ id: cInService?.id }, { enabled: !!cInService?.id });

  // Mutations
  const executeTransMutation = useExecuteTransaction();

  const formattedData = customerData?.items?.map(item => ({
    key: item.id,
    phone: item.phone,
    name: item.name || 'Thành viên MiniWallet',
    pocket: item.pocket ? item.pocket.id : 'N/A', 
    createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
    balance: item.pocket ? item.pocket.balance : 0 
  })) || [];

  useEffect(() => {
    if (io && io.socket) {
      io.socket.on('transaction_updated', () => refetchCustomers());
      io.socket.on('customer_created', () => {
        setPagination(prev => ({ ...prev, current: 1 }));
        refetchCustomers();
      });
    }
    return () => {
      if (io && io.socket) {
        io.socket.off('transaction_updated');
        io.socket.off('customer_created');
      }
    };
  }, [io, refetchCustomers]);

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const handleSearch = (value) => {
    setFilterPhone(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form] = Form.useForm();

  const handleCashInClick = (record) => {
    setSelectedCustomer(record);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleCashInSubmit = (values) => {
    const serviceConfig = { ...cInService, ...cashInServiceDetail };
    if (!serviceConfig || !serviceConfig.id) {
      return notification.error({ message: 'Lỗi', description: 'Không tìm thấy dịch vụ Nạp tiền (cashIn) đang active trong hệ thống.' });
    }

    const actionParams = serviceConfig.serviceInfo?.actionParams || {};
    const bankFieldName = actionParams.bankPocketField || 'BANKID';
    const phoneFieldName = actionParams.receiverPhoneField || 'RECEIVERPHONE';

    let amountFieldName = 'AMOUNT';
    const acctSteps = serviceConfig.accountingSteps || [];
    if (acctSteps.length > 0) {
      amountFieldName = acctSteps[0].amount;
    } else if (serviceConfig.fields) {
      const amountFieldConf = serviceConfig.fields.find(f => f.fieldFormat === 'number');
      if (amountFieldConf) amountFieldName = amountFieldConf.fieldName;
    }

    const transData = {
      [phoneFieldName]: selectedCustomer.phone,
      [amountFieldName]: values.amount,
      [bankFieldName]: values.sourcePocketId,
      description: values.note
    };

    executeTransMutation.mutate(
      {
        serviceId: serviceConfig.id || serviceConfig.serviceInfo?.serviceCode,
        transData
      },
      {
        onSuccess: () => {
          notification.success({ 
            message: 'Thành công', 
            description: `Nạp thành công ${values.amount.toLocaleString()} VND cho ${selectedCustomer.phone}`
          });
          setIsModalVisible(false);
          refetchCustomers();
        },
        onError: (error) => {
          notification.error({ 
            message: 'Thất bại', 
            description: error.message || 'Có lỗi xảy ra khi nạp tiền.' 
          });
        }
      }
    );
  };

  const columns = [
    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone', align: 'center', width: '15%', render: text => <Text strong style={{ color: '#0f172a' }}>{text}</Text> },
    { title: 'Họ và tên', dataIndex: 'name', key: 'name', align: 'center', width: '20%' },
    { title: 'Mã ví', dataIndex: 'pocket', key: 'pocket', align: 'center', width: '15%', render: text => text !== 'N/A' ? <Text code copyable={{ text: text }} title={text}>{formatId(text)}</Text> : <Text type="secondary">N/A</Text> },
    { title: 'Số dư', dataIndex: 'balance', key: 'balance', align: 'center', width: '15%', render: text => <Text type="success" strong style={{ fontSize: 15 }}>{text.toLocaleString()}</Text> },
    { title: 'Ngày đăng ký', dataIndex: 'createdAt', key: 'createdAt', align: 'center', width: '20%' },
    { title: 'Thao tác', key: 'action', align: 'center', width: '15%', render: (_, record) => (
      <Space>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleCashInClick(record)} style={{ background: '#0ea5e9' }}>Nạp tiền</Button>
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
          dataSource={formattedData} 
          pagination={{ ...pagination, showSizeChanger: false, total: customerData?.total || 0 }} 
          onChange={handleTableChange}
          loading={loadingCustomers}
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
                <Form.Item label="Số điện thoại khách hàng">
                  <Input value={selectedCustomer.phone} disabled size="large" style={{ color: '#0f172a', fontWeight: 600 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Mã ví">
                  <Input value={selectedCustomer.pocket} disabled size="large" />
                </Form.Item>
              </Col>
            </Row>
            
            <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, marginBottom: 24, border: '1px solid #e2e8f0' }}>
              <Text style={{ color: '#64748b' }}>Số dư hiện tại:</Text>
              <Title level={2} style={{ margin: 0, color: '#10b981' }}>
                {selectedCustomer.balance.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 500 }}>VND</span>
              </Title>
            </div>

            <Form.Item 
              label={<Text strong>Trích từ Két tiền mặt quầy (Nguồn)</Text>} 
              name="sourcePocketId" 
              rules={[{ required: true, message: 'Vui lòng chọn két tiền mặt!' }]}
            >
              <Select size="large" placeholder="-- Chọn Két tiền mặt --">
                {otcPocketsData?.items?.map(pocket => (
                  <Option key={pocket.id} value={pocket.id}>
                    <WalletOutlined style={{ marginRight: 8, color: '#0ea5e9' }} />
                    {pocket.name || 'Không tên'} - {formatId(pocket.id)} (Dư: {pocket.balance.toLocaleString('vi-VN')})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item 
              label={<Text strong>Số tiền nạp</Text>} 
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

            <Form.Item label="Lý do / Ghi chú" name="note">
              <Input.TextArea placeholder="Ghi chú giao dịch (ví dụ: Khách nộp tiền mặt)..." rows={3} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)} size="large">Hủy bỏ</Button>
                <Button type="primary" htmlType="submit" size="large" loading={executeTransMutation.isPending} style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}>
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
