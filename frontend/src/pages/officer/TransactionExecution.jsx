import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Select, Card, Typography, Spin, message, Alert, Divider } from 'antd';
import { DollarOutlined, BankOutlined, PhoneOutlined, ArrowRightOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TransactionExecution() {
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  
  const [serviceDetail, setServiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [pendingAuth, setPendingAuth] = useState(null); // { transRefId, preview } khi cần PIN

  // Fetch all active services
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const token = localStorage.getItem('officer_token');
        const res = await axios.post(
          'http://localhost:1337/api/officer/services/list',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.status === 'success') {
          // Chỉ lấy các dịch vụ đang active
          const activeServices = res.data.data.filter(s => s.status === 'active');
          setServices(activeServices);
        }
      } catch (err) {
        message.error('Không thể lấy danh sách dịch vụ.');
      }
      setLoadingServices(false);
    };
    fetchServices();
  }, []);

  // Fetch service details when a service is selected
  useEffect(() => {
    if (!selectedServiceId) {
      setServiceDetail(null);
      form.resetFields();
      return;
    }

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const token = localStorage.getItem('officer_token');
        const res = await axios.post(
          'http://localhost:1337/api/officer/services/detail',
          { id: selectedServiceId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.status === 'success') {
          setServiceDetail(res.data.data);
          form.resetFields();
          setResult(null);
        }
      } catch (err) {
        message.error('Không thể lấy cấu hình chi tiết của dịch vụ.');
      }
      setLoadingDetail(false);
    };
    fetchDetail();
  }, [selectedServiceId, form]);

  const onFinish = async (values) => {
    setExecuting(true);
    setResult(null);
    setPendingAuth(null);
    try {
      const token = localStorage.getItem('officer_token');
      const res = await axios.post(
        'http://localhost:1337/api/officer/transactions/execute',
        { serviceId: selectedServiceId, transData: values },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = res.data.data;
      if (data.requireAuth) {
        // Service yêu cầu PIN — hiện form nhập mã
        setPendingAuth({ transRefId: data.transRefId, preview: data.preview, authMethod: data.authMethod });
        message.info(`Dịch vụ yêu cầu xác thực ${data.authMethod}. Vui lòng nhập mã.`);
        form.resetFields();
      } else {
        message.success('Giao dịch thành công!');
        setResult({ type: 'success', data });
        form.resetFields();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra.';
      message.error(errMsg);
      setResult({ type: 'error', message: errMsg });
    }
    setExecuting(false);
  };

  const onVerifyPin = async (values) => {
    setExecuting(true);
    try {
      const token = localStorage.getItem('officer_token');
      const res = await axios.post(
        'http://localhost:1337/api/officer/transactions/verify',
        { transRefId: pendingAuth.transRefId, authCode: values.authCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success('Giao dịch thành công!');
      setResult({ type: 'success', data: res.data.data });
      setPendingAuth(null);
      pinForm.resetFields();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Mã xác thực không đúng.';
      message.error(errMsg);
    }
    setExecuting(false);
  };

      // 1. Fetch bank pockets state
  const [bankPockets, setBankPockets] = useState([]);
  useEffect(() => {
    const fetchBankPockets = async () => {
      try {
        const token = localStorage.getItem('officer_token');
        const res = await axios.post(
          'http://localhost:1337/api/officer/pockets/list',
          { client: 'bank' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.status === 'success') {
          setBankPockets(res.data.data.filter(p => p.status === 'active'));
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách ví Bank', err);
      }
    };
    fetchBankPockets();
  }, []);

  // Filter out system fields to render only user-defined fields
  const renderDynamicFields = () => {
    if (!serviceDetail || !serviceDetail.fields) return null;

    const ignoreFields = ['SERVICEID', 'CURRENCY', 'SENDERID', 'RECEIVERID'];
    const officerFields = serviceDetail.fields.filter(f => !ignoreFields.includes(f.fieldName));

    if (officerFields.length === 0) {
      return <Alert type="info" message="Dịch vụ này không yêu cầu tham số đầu vào nào từ Officer." style={{ marginBottom: 24 }} />;
    }

    const actionParams = serviceDetail.serviceInfo?.actionParams || {};
    const bankPocketField = actionParams.bankPocketField || 'BANKID';

    return officerFields.map(field => {
      // Xác định icon dựa vào fieldFormat hoặc tên biến
      let prefix = null;
      if (field.fieldFormat === 'number') prefix = <DollarOutlined />;         // Ưu tiên format
      else if (field.fieldName.includes('PHONE')) prefix = <PhoneOutlined />;
      else if (field.fieldName.includes('BANK')) prefix = <BankOutlined />;

      // Xác định Component Input — dùng fieldFormat làm chuẩn, không phụ thuộc tên biến
      let InputComponent = <Input size="large" prefix={prefix} placeholder={`Nhập ${field.fieldName}`} />;
      
      // BẮT RIÊNG TRƯỜNG BANKID ĐỂ CHUYỂN THÀNH DROPDOWN CHỌN VÍ NGÂN HÀNG
      if (field.fieldName === bankPocketField) {
        InputComponent = (
          <Select size="large" placeholder="-- Chọn ví Ngân hàng --">
            {bankPockets.map(p => (
              <Option key={p.id} value={p.id}>{p.id.slice(-6)} - {p.currency} (Dư: {p.balance.toLocaleString('vi-VN')})</Option>
            ))}
          </Select>
        );
      }
      // Nếu là trường kiểu number (dùng fieldFormat, không dùng tên biến)
      else if (field.fieldFormat === 'number') {
        InputComponent = (
          <InputNumber 
            size="large" 
            style={{ width: '100%' }}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
            placeholder={`Nhập ${field.fieldName}`}
          />
        );
      }

      return (
        <Form.Item
          key={field.fieldName}
          name={field.fieldName}
          label={field.fieldName}
          rules={[
            { required: field.isRequired, message: field.errorMessage }
          ]}
        >
          {InputComponent}
        </Form.Item>
      );
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Thực hiện Giao dịch</Title>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Form layout="vertical">
          <Form.Item label="Chọn dịch vụ" required>
            <Select 
              size="large"
              placeholder="-- Chọn dịch vụ cần thực hiện --"
              loading={loadingServices}
              value={selectedServiceId}
              onChange={val => setSelectedServiceId(val)}
              options={services.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
          </Form.Item>
        </Form>

        {loadingDetail && <Spin style={{ display: 'block', margin: '20px auto' }} />}

        {!loadingDetail && serviceDetail && (
          <Divider orientation="left">Thông tin Giao dịch</Divider>
        )}

        {!loadingDetail && serviceDetail && (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            {renderDynamicFields()}

            <Form.Item style={{ marginTop: 32 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                loading={executing}
                icon={<ArrowRightOutlined />}
                style={{ height: 50, fontSize: 16, fontWeight: 'bold' }}
              >
                Thực hiện {serviceDetail.serviceInfo.serviceName}
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Form nhập PIN khi service yêu cầu xác thực */}
        {pendingAuth && (
          <>
            <Divider orientation="left">Xác thực giao dịch</Divider>
            <Alert
              type="warning"
              showIcon
              message={`Dịch vụ yêu cầu ${pendingAuth.authMethod}`}
              description={
                <div>
                  <p>Mã giao dịch chờ: <strong>{pendingAuth.transRefId}</strong></p>
                  {pendingAuth.preview && (
                    <p>Tổng tiền: <strong>{pendingAuth.preview.totalAmount?.toLocaleString('vi-VN')} {pendingAuth.preview.currency}</strong></p>
                  )}
                </div>
              }
              style={{ marginBottom: 16 }}
            />
            <Form form={pinForm} layout="inline" onFinish={onVerifyPin}>
              <Form.Item name="authCode" rules={[{ required: true, message: 'Nhập mã xác thực!' }]}>
                <Input.Password size="large" placeholder={`Nhập ${pendingAuth.authMethod}`} style={{ width: 200 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" size="large" loading={executing}>
                  Xác nhận
                </Button>
              </Form.Item>
              <Form.Item>
                <Button size="large" onClick={() => setPendingAuth(null)}>Hủy</Button>
              </Form.Item>
            </Form>
          </>
        )}

        {result && result.type === 'success' && (
          <Alert
            message="Giao dịch thành công"
            description={
              <div>
                <p><strong>Mã giao dịch:</strong> {result.data?.transactionId || result.data?.transRefId}</p>
                <p><strong>Trạng thái:</strong> {result.data?.status}</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}

        {result && result.type === 'error' && (
          <Alert
            message="Giao dịch thất bại"
            description={result.message}
            type="error"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}
      </Card>
    </div>
  );
}
