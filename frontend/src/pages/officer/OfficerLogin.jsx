import React from 'react';
import { Card, Form, Input, Button, Typography, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, RightOutlined, WalletFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function OfficerLogin() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleLogin = (values) => {
    // Mock login logic
    console.log('Officer logging in with:', values);
    // Simple redirect to admin dashboard (services)
    navigate('/officer/services');
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Col xs={24} sm={16} md={12} lg={8} xl={6}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <WalletFilled style={{ color: '#0ea5e9', fontSize: 48 }} />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Mini<span style={{ color: '#0ea5e9' }}>Wallet</span>
          </Title>
          <Text style={{ color: '#64748b' }}>Officer Workspace</Text>
        </div>

        <Card className="glass-card" style={{ borderRadius: 24, padding: 8 }}>
          <Title level={4} style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Officer Login</Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            initialValues={{ username: 'admin', password: 'password123' }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please input your username!' }]}
            >
              <Input 
                size="large" 
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="Username" 
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password 
                size="large"
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
                placeholder="Password" 
                style={{ borderRadius: 12 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                style={{ borderRadius: 12, height: 48, fontWeight: 600 }}
              >
                Login to Workspace
              </Button>
            </Form.Item>
          </Form>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>Protected System Area</Text>
        </div>
      </Col>
    </Row>
  );
}
