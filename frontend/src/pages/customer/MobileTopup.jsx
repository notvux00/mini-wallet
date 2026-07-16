 
import { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Modal, Steps, Divider, Result, Select, Spin, Row, Col, notification, Alert } from 'antd';
import { MobileOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useServices, useBillers, useRequestTransaction, useConfirmTransaction, useVerifyTransaction } from '../../hooks/useTransaction';

const { Title, Text } = Typography;
const { Option } = Select;

export default function MobileTopup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  
  const [selectedAmount, setSelectedAmount] = useState(null);
  const navigate = useNavigate();
  
  const selectedServiceId = Form.useWatch('serviceId', form);
  
  // Queries & Mutations
  const { data: rawServices = [], isLoading: isLoadingServices } = useServices('billerTrans');
  const { data: rawBillers = [], isLoading: isLoadingBillers } = useBillers();
  const requestMutation = useRequestTransaction();
  const confirmMutation = useConfirmTransaction();
  const verifyMutation = useVerifyTransaction();

  // Lọc đúng Topup
  const services = rawServices.filter(s => s.code.includes('TOPUP'));
  const billers = rawBillers.filter(b => b.code.includes('TOPUP'));
  
  const isLoading = isLoadingServices || isLoadingBillers || requestMutation.isPending || confirmMutation.isPending || verifyMutation.isPending;
  const currentService = services.find(s => s.id === selectedServiceId) || services[0];
  const discountPercent = currentService ? (Number(currentService.discount) || Number(currentService.actionParams?.discountRate) || 0) : 0;

  const predefinedAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      form.setFieldsValue({ serviceId: services[0].id });
    }
  }, [services, selectedServiceId, form]);

  const handleSelectAmount = (amt) => {
    setSelectedAmount(amt);
    form.setFieldsValue({ amount: amt });
  };

  const handleRequestTransaction = async (values) => {
    if (!values.amount) {
      return notification.error({ message: 'Lỗi', description: 'Vui lòng chọn mệnh giá nạp' });
    }
    
    try {
      const selectedService = services.find(s => s.id === values.serviceId);
      if (!selectedService) {
        return notification.error({ message: 'Lỗi', description: 'Vui lòng chọn Dịch vụ nạp thẻ.' });
      }

      // Đọc cấu hình field động từ Backend
      const billerIdField = selectedService.actionParams?.billerIdField || 'BILLERID';
      const customerCodeField = selectedService.actionParams?.customerCodeField || 'PHONE';
      const amountField = selectedService.amountField || 'AMOUNT';

      const transDataPayload = {
        [billerIdField]: values.billerCode,
        [customerCodeField]: values.phone,
        [amountField]: values.amount,
        DESCRIPTION: 'Nạp tiền điện thoại'
      };

      // BƯỚC 1: Request
      const data = await requestMutation.mutateAsync({
        serviceId: selectedService.id,
        transData: transDataPayload
      });
      
      // BƯỚC 2: Confirm
      await confirmMutation.mutateAsync(data.transRefId);
      
      const transBody = data.preview || data;
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
    } catch (error) {
      notification.error({ 
        message: 'Lỗi giao dịch', 
        description: error.message || 'Có lỗi xảy ra khi kết nối hệ thống.' 
      });
    }
  };

  const handleConfirmPin = async (values) => {
    try {
      const verifyData = await verifyMutation.mutateAsync({
        transRefId: previewData.transRefId,
        authCode: values.pin
      });
      
      if (verifyData) {
        setCurrentStep(2);
        pinForm.resetFields();
      }
    } catch (err) {
      let errorMsg = err.message || 'Mã PIN không đúng hoặc lỗi hệ thống.';
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
        notification.error({ message: 'Lỗi xác thực', description: errorMsg });
      }
    }
  };

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
          <Spin spinning={isLoading}>
            {!isLoadingServices && services.length === 0 ? (
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

                <Button type="primary" htmlType="submit" size="large" block loading={requestMutation.isPending || confirmMutation.isPending}>
                  Tiếp tục
                </Button>
              </Form>
            )}
          </Spin>
        </Card>
      )}

      {/* BƯỚC 2: Xác nhận và PIN */}
      {currentStep === 1 && previewData && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Spin spinning={isLoading}>
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
                  <Button size="large" block onClick={() => setCurrentStep(0)} disabled={verifyMutation.isPending}>
                    Quay lại
                  </Button>
                </Col>
                <Col span={12}>
                  <Button type="primary" htmlType="submit" size="large" block loading={verifyMutation.isPending}>
                    Xác nhận Nạp
                  </Button>
                </Col>
              </Row>
            </Form>
          </Spin>
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
