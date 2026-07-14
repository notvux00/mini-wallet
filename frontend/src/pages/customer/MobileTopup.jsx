import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Modal, Steps, Divider, Result, Select, Spin, Row, Col, message, Alert } from 'antd';
import { MobileOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

export default function MobileTopup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [billers, setBillers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const navigate = useNavigate();
  const selectedServiceId = Form.useWatch('serviceId', form);
  const selectedBillerCode = Form.useWatch('billerCode', form);

  const predefinedAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  const currentService = services.find(s => s.id === selectedServiceId) || services[0];
  const discountPercent = currentService ? (Number(currentService.discount) || 0) : 0;

  useEffect(() => {
    const fetchBillersAndServices = async () => {
      try {
        const [billerRes, serviceRes] = await Promise.all([
          axios.post('/api/customer/billers/list'),
          axios.post('/api/customer/services/list', { action: 'billerTrans' })
        ]);

        if (billerRes.data?.data) {
          const list = billerRes.data.data.filter(b => b.code.includes('TOPUP'));
          setBillers(list);
        }

        if (serviceRes.data?.data) {
          const list = serviceRes.data.data.filter(s => s.code.includes('TOPUP'));
          setServices(list);
          if (list.length > 0) {
            form.setFieldsValue({ serviceId: list[0].id });
          }
        }
      } catch (error) {
        console.error('Không tải được dữ liệu', error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchBillersAndServices();
  }, [form]);

  const handleSelectAmount = (amt) => {
    setSelectedAmount(amt);
    form.setFieldsValue({ amount: amt });
  };

  const handleRequestTransaction = async (values) => {
    if (!values.amount) {
      message.error('Vui lòng chọn mệnh giá nạp');
      return;
    }

    setIsProcessing(true);
    
    try {
      const selectedService = services.find(s => s.id === values.serviceId);
      if (!selectedService) {
        Modal.error({ title: 'Lỗi', content: 'Vui lòng chọn Dịch vụ nạp thẻ.' });
        setIsProcessing(false);
        return;
      }

      // Đọc cấu hình field động từ Backend (Config-driven)
      const billerIdField = selectedService.actionParams?.billerIdField || 'BILLERID';
      const customerCodeField = selectedService.actionParams?.customerCodeField || 'PHONE';
      const amountField = selectedService.amountField || 'AMOUNT';

      // Tạo payload động (Config-driven)
      const transDataPayload = {
        [billerIdField]: values.billerCode,
        [customerCodeField]: values.phone,
        [amountField]: values.amount,
        DESCRIPTION: 'Nạp tiền điện thoại'
      };

      // BƯỚC 1: Gọi Engine Request
      const response = await axios.post('/api/customer/transaction/request', {
        serviceId: selectedService.id,
        transData: transDataPayload
      });
      
      if (response.data?.err === 0 || response.data?.err === 200) {
        const data = response.data.data;
        const transBody = data.preview || data;
        
        // BƯỚC 2: Gọi Confirm để chốt sổ kế toán
        await axios.post('/api/customer/transaction/confirm', { transRefId: data.transRefId });
        
        setPreviewData({
          phone: values.phone,
          billerCode: values.billerCode,
          amount: transBody[amountField] || transBody.AMOUNT || values.amount,
          discount: transBody.DISCOUNT || 0,
          fee: transBody.FEE || 0,
          totalAmount: transBody.TOTALAMOUNT || transBody.AMOUNT || values.amount,
          description: transBody.DESCRIPTION || transBody.description || 'Nạp tiền điện thoại',
          transRefId: data.transRefId,
        });
        
        setCurrentStep(1);
      } else {
        Modal.error({ title: 'Lỗi hệ thống', content: response.data?.msg || 'Không thể tạo giao dịch nạp thẻ.' });
      }
    } catch (error) {
      Modal.error({ 
        title: 'Lỗi giao dịch', 
        content: error.response?.data?.msg || error.message || 'Có lỗi xảy ra khi kết nối hệ thống.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPin = async (values) => {
    setIsProcessing(true);
    try {
      // BƯỚC 3: Verify bằng mã PIN
      const response = await axios.post('/api/customer/transaction/verify', {
        transRefId: previewData.transRefId,
        authCode: values.pin
      });
      
      if (response.data?.err === 0 || response.data?.err === 200) {
        setCurrentStep(2); // Move to Success
        pinForm.resetFields();
      } else {
        message.error(response.data?.msg || 'Giao dịch không thành công.');
      }
    } catch (err) {
      let errorMsg = err.response?.data?.data?.message || err.response?.data?.message || err.message || 'Mã PIN không đúng hoặc lỗi hệ thống.';
      const rawError = errorMsg;
      
      if (errorMsg.includes(': ')) {
        errorMsg = errorMsg.substring(errorMsg.indexOf(': ') + 2);
      }
      
      if (rawError.includes('PIN_LOCKED') || rawError.includes('INVALID_STATUS')) {
        Modal.error({
          title: 'Giao dịch bị hủy',
          content: errorMsg,
          okText: 'Về trang chủ',
          onOk: () => navigate('/app/home')
        });
      } else {
        message.error(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingServices) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>Nạp Tiền Điện Thoại</Title>
      
      <Steps current={currentStep} style={{ marginBottom: 32 }}>
        <Steps.Step title="Nhập thông tin" />
        <Steps.Step title="Xác nhận" />
        <Steps.Step title="Hoàn tất" />
      </Steps>

      {/* BƯỚC 1: Form nhập thông tin */}
      {currentStep === 0 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          {services.length === 0 ? (
            <Alert message="Chưa có dịch vụ Nạp thẻ nào được cấu hình trên hệ thống." type="warning" showIcon />
          ) : (
            <Form form={form} layout="vertical" onFinish={handleRequestTransaction}>
              
              <Form.Item name="serviceId" label="Dịch vụ Nạp thẻ" rules={[{ required: true }]}>
                <Select size="large">
                  {services.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>

              <Form.Item 
                name="phone" 
                label="Số điện thoại" 
                rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
              >
                <Input 
                  size="large" 
                  prefix={<MobileOutlined style={{ color: '#0ea5e9' }} />} 
                  placeholder="Nhập số điện thoại cần nạp" 
                  type="tel"
                />
              </Form.Item>

              <Form.Item 
                name="billerCode" 
                label="Nhà mạng" 
                rules={[{ required: true, message: 'Vui lòng chọn nhà mạng' }]}
              >
                <Select size="large" placeholder="Chọn nhà mạng (VD: Viettel)">
                  {billers.map(b => (
                    <Option key={b.code} value={b.code}>{b.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="amount" noStyle>
                <Input type="hidden" />
              </Form.Item>

              <div style={{ marginBottom: 8 }}>
                <Text strong>Mệnh giá nạp <span style={{color: '#ff4d4f'}}>*</span></Text>
              </div>
              <div style={{ marginBottom: 24 }}>
                <Row gutter={[12, 12]}>
                  {predefinedAmounts.map(amt => (
                    <Col span={8} key={amt}>
                      <Button 
                        block 
                        size="large"
                        type={selectedAmount === amt ? 'primary' : 'default'}
                        onClick={() => handleSelectAmount(amt)}
                        style={{ height: discountPercent > 0 ? 65 : 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{(amt / 1000).toLocaleString('vi-VN')}K</span>
                        {discountPercent > 0 && (
                          <span style={{ fontSize: 12, color: selectedAmount === amt ? '#fff' : '#10b981', marginTop: 2, fontWeight: 'normal' }}>
                            Hoàn {(amt * discountPercent / 100).toLocaleString('vi-VN')}đ
                          </span>
                        )}
                      </Button>
                    </Col>
                  ))}
                </Row>
              </div>

              <Button type="primary" htmlType="submit" size="large" block loading={isProcessing}>
                Tiếp tục
              </Button>
            </Form>
          )}
        </Card>
      )}

      {/* BƯỚC 2: Xác nhận và PIN */}
      {currentStep === 1 && previewData && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Text type="secondary">Nạp tiền cho số điện thoại</Text>
            <Title level={2} style={{ margin: '8px 0', color: '#0ea5e9' }}>{previewData.phone}</Title>
          </div>

          <Card type="inner" style={{ marginBottom: 24, background: '#f8fafc', borderRadius: 12 }}>
            <Row justify="space-between" style={{ marginBottom: 12 }}>
              <Text type="secondary">Nhà mạng:</Text>
              <Text strong>{previewData.billerCode}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 12 }}>
              <Text type="secondary">Mệnh giá:</Text>
              <Text strong>{previewData.amount.toLocaleString('vi-VN')} đ</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 12 }}>
              <Text type="secondary">Phí giao dịch:</Text>
              <Text strong>{previewData.fee === 0 ? 'Miễn phí' : `${previewData.fee.toLocaleString('vi-VN')} đ`}</Text>
            </Row>
            {previewData.discount > 0 && (
              <Row justify="space-between" style={{ marginBottom: 12 }}>
                <Text type="secondary">Chiết khấu / Hoàn tiền:</Text>
                <Text strong style={{ color: '#10b981' }}>- {previewData.discount.toLocaleString('vi-VN')} đ</Text>
              </Row>
            )}
            <Row justify="space-between" style={{ marginBottom: 12 }}>
              <Text type="secondary">Nội dung:</Text>
              <Text strong>{previewData.description}</Text>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row justify="space-between">
              <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
              <Text strong style={{ fontSize: 20, color: '#ef4444' }}>
                {(previewData.totalAmount - (previewData.discount || 0)).toLocaleString('vi-VN')} đ
              </Text>
            </Row>
          </Card>

          <Form form={pinForm} layout="vertical" onFinish={handleConfirmPin}>
            <Form.Item 
              name="pin" 
              label="Nhập mã PIN để xác nhận" 
              rules={[{ required: true, message: 'Vui lòng nhập mã PIN' }]}
            >
              <Input.Password 
                size="large" 
                prefix={<LockOutlined />} 
                placeholder="Nhập mã PIN 6 số" 
                maxLength={6}
                autoFocus
              />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Button size="large" block onClick={() => setCurrentStep(0)} disabled={isProcessing}>
                  Quay lại
                </Button>
              </Col>
              <Col span={12}>
                <Button type="primary" htmlType="submit" size="large" block loading={isProcessing}>
                  Xác nhận Nạp
                </Button>
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      {/* BƯỚC 3: Thành công */}
      {currentStep === 2 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            status="success"
            title="Nạp tiền thành công!"
            subTitle={`Số điện thoại ${previewData?.phone} đã được nạp ${previewData?.amount.toLocaleString('vi-VN')} đ.`}
            extra={[
              <Button type="primary" size="large" key="home" onClick={() => navigate('/app/home')}>
                Về Trang chủ
              </Button>,
              <Button size="large" key="history" onClick={() => navigate('/app/history')}>
                Xem Lịch sử
              </Button>,
            ]}
          />
        </Card>
      )}
    </div>
  );
}
