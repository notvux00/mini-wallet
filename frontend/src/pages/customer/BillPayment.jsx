import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Modal, Steps, Divider, Result, Select, Spin, Alert } from 'antd';
import { LockOutlined, ThunderboltOutlined, WifiOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

export default function BillPayment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isEnquiring, setIsEnquiring] = useState(false);
  const navigate = useNavigate();

  const handleEnquiry = (values) => {
    setIsEnquiring(true);
    
    // Simulate API call to Enquiry URL
    setTimeout(() => {
      setIsEnquiring(false);
      
      // Step 1: Request & Enquiry
      // In real app, the backend calls biller inquiryUrl to get the amount
      const amount = 350000; // Mock amount returned from Biller
      const fee = 2000; // Mock fixed fee
      const total = amount + fee;
      
      setPreviewData({
        billerId: values.billerId,
        customerCode: values.customerCode,
        amount,
        fee,
        total,
        transRefId: 'TRAIL-BILL-' + Date.now(),
        customerName: 'NGUYEN VAN A', // Mock data from biller
        billPeriod: '05/2026'
      });
      
      // Show PIN modal (Step 2: Confirm)
      setIsPinModalVisible(true);
    }, 1500); // simulate network delay
  };

  const handleConfirmPin = () => {
    pinForm.validateFields().then(values => {
      // Step 3: Verify & Payment
      // In real app, calls engineVerifyTransaction -> then calls Biller paymentUrl
      console.log('Paying bill with PIN:', values.pin, 'for Trail:', previewData.transRefId);
      setIsPinModalVisible(false);
      setCurrentStep(2); // Move to Success Result
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>Pay Bills</Title>
      
      <Steps 
        current={currentStep} 
        items={[
          { title: 'Enquiry' },
          { title: 'Confirm' },
          { title: 'Result' }
        ]}
        style={{ marginBottom: 32 }}
      />

      {currentStep === 0 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Form form={form} layout="vertical" onFinish={handleEnquiry}>
            <Form.Item 
              name="billerId" 
              label="Select Service Provider"
              rules={[{ required: true, message: 'Please select a biller!' }]}
            >
              <Select size="large" placeholder="Select provider">
                <Option value="EVN"><ThunderboltOutlined style={{ color: '#eab308', marginRight: 8 }}/> EVN (Electricity)</Option>
                <Option value="WATER">Water Supply</Option>
                <Option value="INTERNET"><WifiOutlined style={{ color: '#10b981', marginRight: 8 }}/> Internet / TV</Option>
              </Select>
            </Form.Item>
            
            <Form.Item 
              name="customerCode" 
              label="Customer Code / Contract Number"
              rules={[{ required: true, message: 'Please input customer code!' }]}
              extra="Enter your biller customer code (e.g. PE012345678)"
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

      {currentStep === 2 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Result
            status="success"
            title="Payment Successful!"
            subTitle={`Transaction Ref: ${previewData?.transRefId}`}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/app/home')}>
                Back to Dashboard
              </Button>,
              <Button key="new" onClick={() => { form.resetFields(); setCurrentStep(0); setPreviewData(null); }}>
                Pay Another Bill
              </Button>,
            ]}
          >
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Provider</Text>
                <Text strong>{previewData?.billerId}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Customer Code</Text>
                <Text strong>{previewData?.customerCode}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Bill Amount</Text>
                <Text strong>{previewData?.amount?.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Fee</Text>
                <Text strong>{previewData?.fee?.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row justify="space-between">
                <Text strong>Total Deducted</Text>
                <Text strong style={{ color: '#ef4444' }}>{previewData?.total?.toLocaleString('vi-VN')} VND</Text>
              </Row>
            </div>
          </Result>
        </Card>
      )}

      {/* Confirmation & PIN Modal (Step 1 & 2 transition) */}
      <Modal
        title="Confirm Bill Payment"
        open={isPinModalVisible}
        onOk={handleConfirmPin}
        onCancel={() => { setIsPinModalVisible(false); pinForm.resetFields(); }}
        okText="Pay Now"
        okButtonProps={{ danger: true }} // Red button to imply money leaving
      >
        {previewData && (
          <div style={{ marginBottom: 24 }}>
            <Alert 
              message="Bill Found" 
              description={`Hello ${previewData.customerName}, your bill for ${previewData.billPeriod} is ready to be paid.`} 
              type="info" 
              showIcon 
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ padding: 16, background: '#f1f5f9', borderRadius: 8 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text>Provider:</Text>
                <Text strong>{previewData.billerId}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text>Customer Code:</Text>
                <Text strong>{previewData.customerCode}</Text>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text>Bill Amount:</Text>
                <Text strong>{previewData.amount.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text>Convenience Fee:</Text>
                <Text strong>{previewData.fee.toLocaleString('vi-VN')} VND</Text>
              </Row>
              <Divider style={{ margin: '12px 0', borderColor: '#cbd5e1' }} />
              <Row justify="space-between">
                <Text strong>Total Amount:</Text>
                <Text strong style={{ color: '#ef4444', fontSize: 16 }}>{previewData.total.toLocaleString('vi-VN')} VND</Text>
              </Row>
            </div>
          </div>
        )}
        
        <Form form={pinForm} layout="vertical">
          <Form.Item 
            name="pin" 
            label="Enter 6-digit PIN to confirm payment"
            rules={[{ required: true, message: 'PIN is required' }]}
          >
            <Input.Password 
              size="large" 
              maxLength={6} 
              prefix={<LockOutlined />} 
              placeholder="••••••" 
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
