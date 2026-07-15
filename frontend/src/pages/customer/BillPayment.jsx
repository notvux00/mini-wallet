import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Modal, Steps, Divider, Result, Select, Spin, Alert, Row, notification } from 'antd';
import { LockOutlined, ThunderboltOutlined, WifiOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useServices, useBillers, useRequestTransaction, useConfirmTransaction, useVerifyTransaction } from '../../hooks/useTransaction';

const { Title, Text } = Typography;
const { Option } = Select;

export default function BillPayment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  
  const navigate = useNavigate();

  // Queries & Mutations
  const { data: rawServices = [], isLoading: isLoadingServices } = useServices('billerTrans');
  const { data: rawBillers = [], isLoading: isLoadingBillers } = useBillers();
  const requestMutation = useRequestTransaction();
  const confirmMutation = useConfirmTransaction();
  const verifyMutation = useVerifyTransaction();

  const services = rawServices.filter(s => !s.code.includes('TOPUP'));
  const billers = rawBillers.filter(b => !b.code.includes('TOPUP'));

  const isLoading = isLoadingServices || isLoadingBillers || requestMutation.isPending || confirmMutation.isPending || verifyMutation.isPending;

  useEffect(() => {
    if (services.length === 1 && !form.getFieldValue('serviceId')) {
      form.setFieldsValue({ serviceId: services[0].id });
    }
  }, [services, form]);

  const handleEnquiry = async (values) => {
    try {
      const selectedService = services.find(s => s.id === values.serviceId);
      if (!selectedService) {
        return notification.error({ message: 'Lỗi', description: 'Vui lòng chọn Dịch vụ thanh toán.' });
      }

      const billerIdField = selectedService.actionParams?.billerIdField || 'BILLERID';
      const customerCodeField = selectedService.actionParams?.customerCodeField || 'BILLCODE';

      // BƯỚC 1: Request
      const data = await requestMutation.mutateAsync({
        serviceId: selectedService.id,
        transData: {
          [billerIdField]: values.billerId,
          [customerCodeField]: values.customerCode,
          DESCRIPTION: 'Thanh toán hóa đơn'
        }
      });
      
      // BƯỚC 2: Confirm
      await confirmMutation.mutateAsync(data.transRefId);
      
      const transBody = data.preview || data;
      setPreviewData({
        billerId: values.billerId,
        customerCode: values.customerCode,
        amount: transBody.amount || transBody.TOTALAMOUNT || transBody.AMOUNT || 0,
        fee: transBody.fee || transBody.FEE || 0,
        total: transBody.totalAmount || (transBody.TOTALAMOUNT || transBody.AMOUNT || 0) + (transBody.FEE || 0),
        transRefId: data.transRefId,
        customerName: transBody.customerName || transBody.CUSTOMERNAME || 'Khách hàng',
        billPeriod: transBody.billPeriod || transBody.BILLPERIOD || 'Kỳ này',
        billerRef: transBody.billerRef || transBody.BILLERREFID,
        description: transBody.description || transBody.DESCRIPTION || ''
      });
      
      setCurrentStep(1);
    } catch (error) {
      notification.error({ 
        message: 'Lỗi hệ thống', 
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
          title: 'Giao dịch thất bại',
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
      <Title level={3} style={{ marginBottom: 24 }}>Thanh toán Hóa đơn</Title>
      
      <Steps 
        current={currentStep} 
        items={[
          { title: 'Tra Cứu' },
          { title: 'Xác Nhận' },
          { title: 'Hoàn Tất' }
        ]}
        style={{ marginBottom: 32 }}
      />

      {currentStep === 0 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Spin spinning={isLoading}>
            <Form form={form} layout="vertical" onFinish={handleEnquiry}>
              {services.length > 1 && (
                <Form.Item 
                  name="serviceId" 
                  label="Chọn Loại Dịch Vụ"
                  rules={[{ required: true, message: 'Vui lòng chọn loại dịch vụ!' }]}
                >
                  <Select size="large" placeholder="Chọn dịch vụ">
                    {services.map(s => (
                      <Option key={s.id} value={s.id}>{s.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
              
              {/* Ẩn trường serviceId nếu chỉ có 1 dịch vụ */}
              {services.length === 1 && (
                <Form.Item name="serviceId" hidden><Input /></Form.Item>
              )}

              <Form.Item 
                name="billerId" 
                label="Chọn Nhà Cung Cấp"
                rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp!' }]}
              >
                <Select size="large" placeholder="Ví dụ: Điện lực TPHCM">
                  {billers.map(biller => (
                    <Option key={biller.code} value={biller.code}>
                      {biller.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item 
                name="customerCode" 
                label="Mã Khách Hàng / Danh Bộ"
                rules={[{ required: true, message: 'Vui lòng nhập mã khách hàng!' }]}
                extra="Ví dụ: PE012345678"
              >
                <Input size="large" placeholder="PE012345678" />
              </Form.Item>

              <Button 
                type="primary" 
                size="large" 
                block 
                htmlType="submit" 
                style={{ marginTop: 16 }}
                loading={requestMutation.isPending || confirmMutation.isPending}
              >
                Tiếp tục
              </Button>
            </Form>
          </Spin>
        </Card>
      )}

      {currentStep === 1 && previewData && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Spin spinning={isLoading}>
            <div style={{ marginBottom: 24 }}>
              <Alert 
                message="Đã tìm thấy hóa đơn"
                description={`Xin chào ${previewData?.customerName}, hóa đơn ${previewData?.billPeriod} của bạn đã sẵn sàng để thanh toán.`}
                type="info" 
                showIcon 
                style={{ marginBottom: 24 }}
              />
              
              <div style={{ padding: 16, background: '#f1f5f9', borderRadius: 8 }}>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">Nhà Cung Cấp:</Text>
                  <Text strong>{previewData.billerId}</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">Mã Khách Hàng:</Text>
                  <Text strong>{previewData.customerCode}</Text>
                </Row>
                {previewData.billerRef && (
                  <Row justify="space-between" style={{ marginBottom: 8 }}>
                    <Text type="secondary">Mã Hóa Đơn:</Text>
                    <Text strong>{previewData.billerRef}</Text>
                  </Row>
                )}
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">Nội Dung:</Text>
                  <Text strong>{previewData.description || 'Thanh toán hóa đơn'}</Text>
                </Row>
                <Divider style={{ margin: '12px 0' }} />
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">Số Tiền Hóa Đơn:</Text>
                  <Text strong>{previewData.amount?.toLocaleString('vi-VN')} VND</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">Phí Dịch Vụ:</Text>
                  <Text strong>{previewData.fee?.toLocaleString('vi-VN')} VND</Text>
                </Row>
                <Divider style={{ margin: '12px 0' }} />
                <Row justify="space-between">
                  <Text strong>Tổng Tiền:</Text>
                  <Text strong style={{ color: '#ef4444', fontSize: 16 }}>{previewData.total?.toLocaleString('vi-VN')} VND</Text>
                </Row>
              </div>
            </div>
          
            <Form form={pinForm} layout="vertical" onFinish={handleConfirmPin}>
              <Form.Item 
                name="pin" 
                label="Nhập mã PIN 6 số để xác nhận thanh toán"
                rules={[{ required: true, message: 'Mã PIN là bắt buộc' }]}
              >
                <Input.Password 
                  size="large" 
                  maxLength={6} 
                  prefix={<LockOutlined />} 
                  placeholder="••••••" 
                  style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
                />
              </Form.Item>
              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                <Button size="large" onClick={() => { setCurrentStep(0); pinForm.resetFields(); }} style={{ flex: 1 }} disabled={verifyMutation.isPending}>
                  Quay lại
                </Button>
                <Button size="large" type="primary" htmlType="submit" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} loading={verifyMutation.isPending}>
                  Thanh toán ngay
                </Button>
              </div>
            </Form>
          </Spin>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Result
            status="success"
            title="Thanh toán thành công!"
            subTitle={`Mã giao dịch: ${previewData?.transRefId}`}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/app/home')}>
                Về trang chủ
              </Button>,
              <Button key="new" onClick={() => { form.resetFields(); setCurrentStep(0); setPreviewData(null); }}>
                Thanh toán hóa đơn khác
              </Button>,
            ]}
          >
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Nhà Cung Cấp</Text>
                <Text strong>{previewData?.billerId}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Mã Khách Hàng</Text>
                <Text strong>{previewData?.customerCode}</Text>
              </Row>
              {previewData?.billerRef && (
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text type="secondary">Mã Hóa Đơn</Text>
                  <Text strong>{previewData.billerRef}</Text>
                </Row>
              )}
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Nội Dung</Text>
                <Text strong>{previewData?.description || 'Thanh toán hóa đơn'}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Số Tiền Hóa Đơn</Text>
                <Text strong>{previewData?.amount?.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Phí Dịch Vụ</Text>
                <Text strong>{previewData?.fee?.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row justify="space-between">
                <Text strong>Tổng Tiền Bị Trừ</Text>
                <Text strong style={{ color: '#ef4444' }}>{previewData?.total?.toLocaleString('vi-VN')} VND</Text>
              </Row>
            </div>
          </Result>
        </Card>
      )}
    </div>
  );
}
