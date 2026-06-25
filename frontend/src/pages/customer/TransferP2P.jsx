import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Modal, Steps, Divider, Result } from 'antd';
import { MobileOutlined, DollarOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function TransferP2P() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [pinForm] = Form.useForm();
  const [previewData, setPreviewData] = useState(null);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const navigate = useNavigate();

  const handleRequest = (values) => {
    // Step 1: Request (Preview)
    // In real app, calls engineRequestTransaction
    const amount = Number(values.amount);
    const fee = amount * 0.01; // Mock 1% fee
    const total = amount + fee;
    
    setPreviewData({
      receiver: values.receiverPhone,
      amount,
      fee,
      total,
      transRefId: 'TRAIL-' + Date.now()
    });
    
    // Show PIN modal (Step 2: Confirm)
    setIsPinModalVisible(true);
  };

  const handleConfirmPin = () => {
    pinForm.validateFields().then(values => {
      // Step 3: Verify (Result)
      // In real app, calls engineVerifyTransaction with PIN
      console.log('Verifying with PIN:', values.pin, 'for Trail:', previewData.transRefId);
      setIsPinModalVisible(false);
      setCurrentStep(2); // Move to Success Result
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>P2P Transfer</Title>
      
      <Steps 
        current={currentStep} 
        items={[
          { title: 'Details' },
          { title: 'Confirm' },
          { title: 'Result' }
        ]}
        style={{ marginBottom: 32 }}
      />

      {currentStep === 0 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Form form={form} layout="vertical" onFinish={handleRequest}>
            <Form.Item 
              name="receiverPhone" 
              label="Receiver Phone Number"
              rules={[{ required: true, message: 'Please input receiver phone number!' }]}
            >
              <Input size="large" prefix={<MobileOutlined />} placeholder="e.g. 0912345678" />
            </Form.Item>
            
            <Form.Item 
              name="amount" 
              label="Amount (VND)"
              rules={[{ required: true, message: 'Please input amount!' }]}
            >
              <Input size="large" type="number" prefix={<DollarOutlined />} placeholder="50000" />
            </Form.Item>

            <Button type="primary" size="large" block htmlType="submit" style={{ marginTop: 16 }}>
              Continue
            </Button>
          </Form>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="glass-card" style={{ borderRadius: 16 }}>
          <Result
            status="success"
            title="Transfer Successful!"
            subTitle={`Transaction Ref: ${previewData?.transRefId}`}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/app/home')}>
                Back to Dashboard
              </Button>,
              <Button key="new" onClick={() => { form.resetFields(); setCurrentStep(0); setPreviewData(null); }}>
                New Transfer
              </Button>,
            ]}
          >
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Sent to</Text>
                <Text strong>{previewData?.receiver}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text type="secondary">Amount</Text>
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
        title="Confirm Transfer"
        open={isPinModalVisible}
        onOk={handleConfirmPin}
        onCancel={() => { setIsPinModalVisible(false); pinForm.resetFields(); }}
        okText="Confirm & Transfer"
      >
        {previewData && (
          <div style={{ marginBottom: 24, padding: 16, background: '#f1f5f9', borderRadius: 8 }}>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Receiver:</Text>
              <Text strong>{previewData.receiver}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Amount:</Text>
              <Text strong>{previewData.amount.toLocaleString('vi-VN')} VND</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Fee:</Text>
              <Text strong>{previewData.fee.toLocaleString('vi-VN')} VND</Text>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row justify="space-between">
              <Text strong>Total Amount:</Text>
              <Text strong style={{ color: '#ef4444', fontSize: 16 }}>{previewData.total.toLocaleString('vi-VN')} VND</Text>
            </Row>
          </div>
        )}
        
        <Form form={pinForm} layout="vertical">
          <Form.Item 
            name="pin" 
            label="Enter 6-digit PIN to confirm"
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
