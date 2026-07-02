import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, InputNumber, Button, Modal, Steps, Divider, Result, Row, Col, message, Spin, Select } from 'antd';
import { MobileOutlined, DollarOutlined, LockOutlined, ArrowRightOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';

const { Title, Text } = Typography;

export default function TransferP2P() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);   // { transRefId, preview }
  const [transRefId, setTransRefId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const navigate = useNavigate();

  // Fetch danh sách service P2P (action = 'none') dành cho Customer
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.post('/api/customer/services/list', { action: 'none' });
        const list = res.data?.data || [];
        setServices(list);
        if (list.length === 1) setSelectedServiceId(list[0].id);
      } catch {
        // ignore — nếu không load được thì user sẽ thấy warning khi submit
      }
    };
    fetchServices();
  }, []);

  // BƯỚC 1: Gọi /api/customer/transaction/request → nhận preview
  const handleRequest = async (values) => {
    if (!selectedServiceId) return message.warning('Vui lòng chọn loại dịch vụ chuyển tiền.');
    setLoading(true);
    try {
      const res = await axios.post('/api/customer/transaction/request', {
        serviceId: selectedServiceId,
        transData: {
          RECEIVERPHONE: values.receiverPhone,
          AMOUNT: values.amount,
        }
      });
      const data = res.data.data;
      setTransRefId(data.transRefId);
      setPreviewData({
        receiver: values.receiverPhone,
        amount: data.preview?.amount || values.amount,
        fee: data.preview?.fee || 0,
        total: data.preview?.totalAmount || values.amount,
        currency: data.preview?.currency || 'VND',
        transRefId: data.transRefId,
      });
      setCurrentStep(1);
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tạo giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 3: Gọi /api/customer/transaction/verify với PIN
  const handleVerifyPin = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/customer/transaction/verify', {
        transRefId,
        authCode: values.pin,
      });
      if (res.data.data) {
        setCurrentStep(2);
        pinForm.resetFields();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã PIN không đúng hoặc giao dịch đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    pinForm.resetFields();
    setCurrentStep(0);
    setPreviewData(null);
    setTransRefId(null);
  };

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <SwapOutlined style={{ marginRight: 8, color: '#0ea5e9' }} />
        Chuyển tiền P2P
      </Title>

      <Steps
        current={currentStep}
        items={[
          { title: 'Thông tin' },
          { title: 'Xác nhận PIN' },
          { title: 'Hoàn thành' }
        ]}
        style={{ marginBottom: 32 }}
      />

      {/* BƯỚC 1 — Nhập thông tin */}
      {currentStep === 0 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Spin spinning={loading}>
            {services.length > 1 && (
              <Form.Item label="Dịch vụ" style={{ marginBottom: 16 }}>
                <Select
                  size="large"
                  value={selectedServiceId}
                  onChange={setSelectedServiceId}
                  options={services.map(s => ({ value: s.id, label: s.name }))}
                />
              </Form.Item>
            )}
            <Form form={form} layout="vertical" onFinish={handleRequest}>
              <Form.Item
                name="receiverPhone"
                label="Số điện thoại người nhận"
                rules={[{ required: true, message: 'Nhập số điện thoại người nhận!' }]}
              >
                <Input size="large" prefix={<MobileOutlined />} placeholder="VD: 0902222222" />
              </Form.Item>

              <Form.Item
                name="amount"
                label="Số tiền (VND)"
                rules={[
                  { required: true, message: 'Nhập số tiền!' },
                  { type: 'number', min: 10000, message: 'Tối thiểu 10,000đ' }
                ]}
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  prefix={<DollarOutlined />}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/,/g, '')}
                  placeholder="50,000"
                />
              </Form.Item>

              <Button
                type="primary"
                size="large"
                block
                htmlType="submit"
                icon={<ArrowRightOutlined />}
                style={{ marginTop: 8, height: 48 }}
              >
                Tiếp tục
              </Button>
            </Form>
          </Spin>
        </Card>
      )}

      {/* BƯỚC 2 — Preview + nhập PIN */}
      {currentStep === 1 && previewData && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Spin spinning={loading}>
            {/* Preview thông tin giao dịch */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Người nhận</Text>
                <Text strong>{previewData.receiver}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Số tiền</Text>
                <Text strong>{previewData.amount.toLocaleString('vi-VN')} {previewData.currency}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Phí</Text>
                <Text>{previewData.fee.toLocaleString('vi-VN')} {previewData.currency}</Text>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row justify="space-between">
                <Text strong>Tổng khấu trừ</Text>
                <Text strong style={{ color: '#ef4444', fontSize: 16 }}>
                  {previewData.total.toLocaleString('vi-VN')} {previewData.currency}
                </Text>
              </Row>
              <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                Mã giao dịch: {previewData.transRefId}
              </div>
            </div>

            {/* Form nhập PIN */}
            <Form form={pinForm} layout="vertical" onFinish={handleVerifyPin}>
              <Form.Item
                name="pin"
                label="Nhập mã PIN 6 chữ số để xác nhận"
                rules={[
                  { required: true, message: 'PIN là bắt buộc!' },
                  { len: 6, message: 'PIN phải đúng 6 chữ số!' }
                ]}
              >
                <Input.Password
                  size="large"
                  maxLength={6}
                  prefix={<LockOutlined />}
                  placeholder="••••••"
                  style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={10}>
                  <Button block size="large" onClick={() => setCurrentStep(0)}>
                    Quay lại
                  </Button>
                </Col>
                <Col span={14}>
                  <Button type="primary" block size="large" htmlType="submit" danger>
                    Xác nhận chuyển tiền
                  </Button>
                </Col>
              </Row>
            </Form>
          </Spin>
        </Card>
      )}

      {/* BƯỚC 3 — Thành công */}
      {currentStep === 2 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Result
            status="success"
            title="Chuyển tiền thành công!"
            subTitle={`Mã giao dịch: ${previewData?.transRefId}`}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/app/home')}>
                Về Dashboard
              </Button>,
              <Button key="new" onClick={handleReset}>
                Chuyển tiền mới
              </Button>,
            ]}
          >
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Đến</Text>
                <Text strong>{previewData?.receiver}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Số tiền</Text>
                <Text strong>{previewData?.amount?.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Row justify="space-between">
                <Text strong>Tổng khấu trừ</Text>
                <Text strong style={{ color: '#ef4444' }}>{previewData?.total?.toLocaleString('vi-VN')} VND</Text>
              </Row>
            </div>
          </Result>
        </Card>
      )}
    </div>
  );
}
