import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Modal, Steps, Divider, Result, Select, Spin, Alert, Row, message } from 'antd';
import { LockOutlined, ThunderboltOutlined, WifiOutlined } from '@ant-design/icons';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

export default function BillPayment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  const [isEnquiring, setIsEnquiring] = useState(false);
  const [billers, setBillers] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBillersAndServices = async () => {
      try {
        const [billerRes, serviceRes] = await Promise.all([
          axios.post('/api/customer/billers/list'),
          axios.post('/api/customer/services/list', { action: 'billerTrans' })
        ]);

        if (billerRes.data?.data) {
          setBillers(billerRes.data.data);
        }

        if (serviceRes.data?.data) {
          const list = serviceRes.data.data;
          setServices(list);
          if (list.length === 1) {
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

  const handleEnquiry = async (values) => {
    setIsEnquiring(true);
    
    try {
      const selectedService = services.find(s => s.id === values.serviceId);
      if (!selectedService) {
        Modal.error({ title: 'Lỗi', content: 'Vui lòng chọn Dịch vụ thanh toán.' });
        setIsEnquiring(false);
        return;
      }

      const billerIdField = selectedService.actionParams?.billerIdField || 'BILLERID';
      const customerCodeField = selectedService.actionParams?.customerCodeField || 'BILLCODE';

      // Gọi Engine (Step 1) với Key động
      const response = await axios.post('/api/customer/transaction/request', {
        serviceId: selectedService.id,
        transData: {
          [billerIdField]: values.billerId,
          [customerCodeField]: values.customerCode,
          DESCRIPTION: 'Thanh toán hóa đơn'
        }
      });
      
      if (response.data?.err === 0 || response.data?.err === 200) {
        const data = response.data.data;
        const transBody = data.preview || data;
        
        // BƯỚC 2: Gọi Confirm (chuẩn quy trình 3 bước engine)
        await axios.post('/api/customer/transaction/confirm', { transRefId: data.transRefId });
        
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
      } else {
        Modal.error({ title: 'Lỗi tra cứu', content: response.data?.msg || 'Không thể tra cứu hóa đơn.' });
      }
    } catch (error) {
      Modal.error({ 
        title: 'Lỗi hệ thống', 
        content: error.response?.data?.msg || error.message || 'Có lỗi xảy ra khi kết nối hệ thống.' 
      });
    } finally {
      setIsEnquiring(false);
    }
  };

  const handleConfirmPin = async (values) => {
    try {
      const response = await axios.post('/api/customer/transaction/verify', {
        transRefId: previewData.transRefId,
        authCode: values.pin
      });
      
      if (response.data?.err === 0 || response.data?.err === 200) {
        setCurrentStep(2); // Move to Success Result
        pinForm.resetFields();
      } else {
        message.error(response.data?.msg || 'Giao dịch không thành công.');
      }
    } catch (err) {
      let errorMsg = err.response?.data?.data?.message || err.response?.data?.message || 'Mã PIN không đúng hoặc lỗi hệ thống.';
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
    }
  };

  if (loadingServices) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

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
                {Array.isArray(billers) && billers.map(biller => (
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
              loading={isEnquiring}
            >
              {isEnquiring ? 'Checking Bill...' : 'Continue'}
            </Button>
          </Form>
        </Card>
      )}

      {currentStep === 1 && previewData && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
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
              <Button size="large" onClick={() => { setCurrentStep(0); pinForm.resetFields(); }} style={{ flex: 1 }}>
                Quay lại
              </Button>
              <Button size="large" type="primary" htmlType="submit" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}>
                Thanh toán ngay
              </Button>
            </div>
          </Form>
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
