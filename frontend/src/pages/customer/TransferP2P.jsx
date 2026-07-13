import React, { useState, useEffect, useContext } from 'react';
import { Card, Typography, Form, Input, InputNumber, Button, Modal, Steps, Divider, Result, Row, Col, message, Spin, Select } from 'antd';
import { MobileOutlined, DollarOutlined, LockOutlined, ArrowRightOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import { SocketContext } from '../../context/SocketContext';

const { Title, Text } = Typography;

export default function TransferP2P() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);   // { transRefId, preview }
  const [transRefId, setTransRefId] = useState(null);
  const [loading, setLoading] = useState(true); // set true initially
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [balance, setBalance] = useState(0);
  const { io } = useContext(SocketContext);
  const navigate = useNavigate();

  // Fetch danh sách service P2P và số dư
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.post('/api/customer/services/list', { action: 'none' });
        const list = res.data?.data || [];
        setServices(list);
        if (list.length === 1) setSelectedServiceId(list[0].id);
      } catch {
        // ignore
      }
    };
    
    const fetchBalance = async () => {
      try {
        const res = await axios.post('/api/customer/dashboard');
        if (res.data?.data) {
          setBalance(res.data.data.balance || 0);
        }
      } catch {
        // ignore
      }
    };

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchServices(), fetchBalance()]);
      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (io && io.socket) {
      io.socket.on('transaction_updated', () => {
        // Cập nhật lại số dư trên màn hình chuyển tiền nếu có biến động
        const fetchBalance = async () => {
          try {
            const res = await axios.post('/api/customer/dashboard');
            if (res.data?.data) {
              setBalance(res.data.data.balance || 0);
            }
          } catch {}
        };
        fetchBalance();
      });
    }
    return () => {
      if (io && io.socket) {
        io.socket.off('transaction_updated');
      }
    };
  }, [io]);

  // BƯỚC 1: Gọi /api/customer/transaction/request → nhận preview
  const handleRequest = async (values) => {
    if (!selectedServiceId) return message.warning('Vui lòng chọn loại dịch vụ chuyển tiền.');
    setLoading(true);
    try {
      const selectedService = services.find(s => s.id === selectedServiceId);
      const amountFieldName = selectedService?.amountField || 'AMOUNT';
      const receiverFieldName = selectedService?.receiverPhoneField || 'RECEIVERPHONE';
      
      const res = await axios.post('/api/customer/transaction/request', {
        serviceId: selectedServiceId,
        transData: {
          [receiverFieldName]: values.receiverPhone,
          [amountFieldName]: values.amount,
          DESCRIPTION: values.description || `Chuyển tiền cho ${values.receiverPhone}`,
        },
      });
      const data = res.data.data;
      setTransRefId(data.transRefId);

      // BƯỚC 2: Gọi Confirm (theo đúng chuẩn quy trình 3 bước)
      await axios.post('/api/customer/transaction/confirm', { transRefId: data.transRefId });
      const authMethod = selectedService?.authMethod || 'PIN';
      setPreviewData({
        receiver: values.receiverPhone,
        amount: data.preview?.amount || values.amount,
        fee: data.preview?.fee || 0,
        total: data.preview?.totalAmount || values.amount,
        currency: data.preview?.currency || 'VND',
        transRefId: data.transRefId,
        authMethod: authMethod,
        description: values.description || `Chuyển tiền cho ${values.receiverPhone}`
      });

      if (authMethod === 'NONE') {
        const verifyRes = await axios.post('/api/customer/transaction/verify', {
          transRefId: data.transRefId,
          authCode: 'NONE',
        });
        if (verifyRes.data.data) {
          setCurrentStep(2);
        }
      } else {
        setCurrentStep(1);
      }
    } catch (err) {
      message.error(err.message || 'Lỗi khi tạo giao dịch.');
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
        authCode: previewData?.authMethod === 'NONE' ? 'NONE' : values.pin,
      });
      if (res.data.data) {
        setCurrentStep(2);
        pinForm.resetFields();
      }
    } catch (err) {
      let errorMsg = err.message && err.message !== 'Request failed with status code 400' ? err.message : (err.response?.data?.data?.message || err.response?.data?.message || 'Mã PIN không đúng hoặc giao dịch đã hết hạn.');
      const rawError = errorMsg;
      
      if (errorMsg.includes(': ')) {
        errorMsg = errorMsg.substring(errorMsg.indexOf(': ') + 2);
      }
      
      if (rawError.includes('PIN_LOCKED') || rawError.includes('INVALID_STATUS')) {
        Modal.error({
          title: 'Giao dịch thất bại',
          content: errorMsg,
          okText: 'Về trang chủ',
          onOk: () => {
            navigate('/app/home');
          }
        });
      } else {
        message.error(errorMsg);
      }
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

  const getFeeDescription = () => {
    const selectedService = services.find(s => s.id === selectedServiceId);
    if (!selectedService || !selectedService.fee) return 'Miễn phí giao dịch';
    if (selectedService.fee.type === 'fixed') {
      return `Phí giao dịch: ${selectedService.fee.value.toLocaleString()} VND`;
    }
    if (selectedService.fee.type === 'percent') {
      const maxStr = selectedService.fee.max ? ` (Tối đa ${selectedService.fee.max.toLocaleString()} VND)` : '';
      return `Phí giao dịch: ${selectedService.fee.value}% số tiền${maxStr}`;
    }
    return 'Miễn phí giao dịch';
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
            
            {!loading && services.length === 0 ? (
              <Result
                status="warning"
                title="Dịch vụ tạm ngưng"
                subTitle="Hiện tại dịch vụ chuyển tiền P2P đang được bảo trì. Vui lòng quay lại sau!"
              />
            ) : (
              <>
                <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#64748b' }}>Số dư khả dụng:</Text>
                  <Text strong style={{ fontSize: 18, color: '#0ea5e9' }}>{balance.toLocaleString()} VND</Text>
                </div>

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
            
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ fontStyle: 'italic' }}>
                <DollarOutlined style={{ marginRight: 4 }} /> 
                {getFeeDescription()}
              </Text>
            </div>

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
                  { type: 'number', min: 1, message: 'Số tiền không hợp lệ' }
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

              <Form.Item
                name="description"
                label="Ghi chú (Không bắt buộc)"
              >
                <Input.TextArea
                  rows={2}
                  size="large"
                  placeholder="Ví dụ: Tiền ăn trưa, Mua đồ..."
                  maxLength={100}
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
            </>
            )}
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
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Ghi chú</Text>
                <Text>{previewData.description}</Text>
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
              {previewData?.authMethod === 'PIN' ? (
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
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#f0fdf4', borderRadius: 8, marginBottom: 24, border: '1px solid #bbf7d0' }}>
                  <Text type="success" strong>Giao dịch này không yêu cầu mã PIN.</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 13 }}>Vui lòng kiểm tra kỹ thông tin trước khi xác nhận.</Text>
                </div>
              )}

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
                Về Trang chủ
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
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Ghi chú</Text>
                <Text>{previewData?.description}</Text>
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
